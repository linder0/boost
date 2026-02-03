import { ParsedVendorResponse } from '@/lib/ai/parser'
import { Event, DecisionOutcome, EscalationCategory, SuggestedAction } from '@/types/database'
import { parseISO, isWithinInterval, addDays, format } from 'date-fns'
import {
  generateRejection,
  generateNegotiation,
  generateConfirmation,
} from '@/lib/templates/auto-responses'

// ============================================================================
// Types
// ============================================================================

export interface DecisionResult {
  outcome: DecisionOutcome
  reason: string
  proposedNextAction: string | null
  shouldEscalate: boolean
  shouldAutoRespond: boolean
  // Enhanced escalation context
  escalationCategory: EscalationCategory | null
  suggestedActions: SuggestedAction[]
}

interface EscalationOptions {
  category: EscalationCategory
  parsed?: ParsedVendorResponse
  event?: Event
}

// ============================================================================
// Main Decision Engine
// ============================================================================

export function evaluateVendor(
  parsed: ParsedVendorResponse,
  eventConstraints: Event
): DecisionResult {
  // Rule 1: Low confidence parse → Escalate
  if (parsed.confidence === 'low') {
    return escalate('Unclear response - manual review needed', {
      category: 'low_confidence',
      parsed,
      event: eventConstraints,
    })
  }

  // Rule 2: Vendor has questions → Escalate
  if (parsed.questions.length > 0) {
    return escalate(`Vendor questions: ${parsed.questions.join('; ')}`, {
      category: 'vendor_questions',
      parsed,
      event: eventConstraints,
    })
  }

  // Rule 3: Missing critical info → Escalate
  if (parsed.availability.length === 0 && !parsed.quote) {
    return escalate('Missing both availability and pricing information', {
      category: 'missing_info',
      parsed,
      event: eventConstraints,
    })
  }

  // Rule 4: No date overlap → Reject
  if (parsed.availability.length > 0) {
    const hasDateOverlap = checkDateOverlap(
      parsed.availability.map((a) => a.date),
      eventConstraints.preferred_dates.map((d) => d.date),
      eventConstraints.date_flexibility_days
    )

    if (!hasDateOverlap) {
      return {
        outcome: 'REJECT',
        reason: 'No availability on preferred dates',
        proposedNextAction: generateRejection(
          "Unfortunately, your available dates don't align with our event timeline."
        ),
        shouldEscalate: false,
        shouldAutoRespond: true,
        escalationCategory: null,
        suggestedActions: [],
      }
    }
  }

  // Rule 5: Quote evaluation (if provided)
  if (parsed.quote) {
    const budget = eventConstraints.venue_budget_ceiling
    const flexibilityPercent = eventConstraints.budget_flexibility_percent
    const maxBudget = budget * (1 + flexibilityPercent / 100)

    // Over 115% of flexible budget → Reject
    if (parsed.quote.amount > maxBudget * 1.15) {
      return {
        outcome: 'REJECT',
        reason: `Quote $${parsed.quote.amount} exceeds budget by more than 15%`,
        proposedNextAction: generateRejection(
          'After reviewing our budget, your quote exceeds what we can allocate for this component.'
        ),
        shouldEscalate: false,
        shouldAutoRespond: true,
        escalationCategory: null,
        suggestedActions: [],
      }
    }

    // Between 100% and 115% of flexible budget → Escalate for decision
    if (parsed.quote.amount > maxBudget && parsed.quote.amount <= maxBudget * 1.15) {
      const percentOver = Math.round(((parsed.quote.amount - budget) / budget) * 100)
      
      return escalate(
        `Quote $${parsed.quote.amount} is ${percentOver}% over target budget - needs your decision`,
        {
          category: 'budget_edge',
          parsed,
          event: eventConstraints,
        }
      )
    }

    // Within budget and has availability → Viable
    if (parsed.quote.amount <= maxBudget && parsed.availability.length > 0) {
      return {
        outcome: 'VIABLE',
        reason: `Quote within budget ($${parsed.quote.amount}) and dates available`,
        proposedNextAction: generateConfirmation({
          vendorName: 'Vendor', // Will be personalized at send time
          quote: parsed.quote.amount,
          dates: parsed.availability.map((a) => a.date),
        }),
        shouldEscalate: false,
        shouldAutoRespond: false, // Human should review before confirming
        escalationCategory: null,
        suggestedActions: [],
      }
    }
  }

  // Rule 6: Has availability but no quote → Escalate for negotiation
  if (parsed.availability.length > 0 && !parsed.quote) {
    return escalate('Vendor confirmed availability but did not provide pricing', {
      category: 'missing_info',
      parsed,
      event: eventConstraints,
    })
  }

  // Default: Escalate for manual review
  return escalate('Unable to automatically categorize - needs human review', {
    category: 'custom',
    parsed,
    event: eventConstraints,
  })
}

// ============================================================================
// Escalation Helper
// ============================================================================

/**
 * Helper to create an escalation result with structured context
 */
function escalate(reason: string, options: EscalationOptions): DecisionResult {
  const suggestedActions = generateSuggestedActions(options)
  
  return {
    outcome: 'ESCALATE',
    reason,
    proposedNextAction: null,
    shouldEscalate: true,
    shouldAutoRespond: false,
    escalationCategory: options.category,
    suggestedActions,
  }
}

// ============================================================================
// Suggested Actions Generator
// ============================================================================

/**
 * Generate AI-suggested actions based on escalation context
 */
function generateSuggestedActions(options: EscalationOptions): SuggestedAction[] {
  const { category, parsed, event } = options
  const actions: SuggestedAction[] = []

  switch (category) {
    case 'vendor_questions':
      if (parsed?.questions) {
        // Generate a response that addresses each question
        const questionsResponse = generateQuestionsResponse(parsed.questions, event)
        actions.push({
          label: 'Answer vendor questions',
          type: 'reply',
          draftMessage: questionsResponse,
          confidence: 75,
        })
      }
      break

    case 'missing_info':
      // Suggest asking for the missing information
      const missingItems: string[] = []
      if (!parsed?.quote) missingItems.push('pricing')
      if (!parsed?.availability || parsed.availability.length === 0) {
        missingItems.push('availability')
      }
      
      actions.push({
        label: `Request ${missingItems.join(' and ')}`,
        type: 'reply',
        draftMessage: generateMissingInfoRequest(missingItems, event),
        confidence: 85,
      })
      break

    case 'budget_edge':
      if (parsed?.quote && event) {
        // Suggest negotiation
        actions.push({
          label: 'Negotiate price',
          type: 'negotiate',
          draftMessage: generateNegotiation(parsed.quote.amount, event.venue_budget_ceiling),
          confidence: 80,
        })
        
        // Also offer to approve as-is
        actions.push({
          label: 'Accept quote as-is',
          type: 'approve',
          draftMessage: generateConfirmation({
            vendorName: 'Vendor',
            quote: parsed.quote.amount,
            dates: parsed.availability?.map((a) => a.date) || [],
          }),
          confidence: 60,
        })
        
        // Or reject
        actions.push({
          label: 'Decline due to budget',
          type: 'reject',
          draftMessage: generateRejection(
            'After reviewing our budget constraints, we are unable to proceed at this price point.'
          ),
          confidence: 50,
        })
      }
      break

    case 'low_confidence':
      // Suggest asking for clarification
      actions.push({
        label: 'Ask for clarification',
        type: 'reply',
        draftMessage: generateClarificationRequest(),
        confidence: 70,
      })
      break

    case 'custom':
    default:
      // Generic actions
      actions.push({
        label: 'Send follow-up',
        type: 'reply',
        draftMessage: generateGenericFollowUp(event),
        confidence: 60,
      })
      break
  }

  return actions
}

// ============================================================================
// Response Generators
// ============================================================================

function generateQuestionsResponse(questions: string[], event?: Event): string {
  const eventName = event?.name || 'our event'
  const headcount = event?.headcount || 'our expected guest count'
  
  return `Thank you for your questions! I'm happy to provide more details.

${questions.map((q, i) => `Regarding "${q}":
[Please provide your answer here]`).join('\n\n')}

Please let me know if you need any additional information to provide us with a quote.

Best regards,
Event Planning Team`
}

function generateMissingInfoRequest(missingItems: string[], event?: Event): string {
  const itemsList = missingItems.join(' and ')
  const eventName = event?.name || 'our event'
  const preferredDates = event?.preferred_dates
    ?.slice(0, 3)
    .map((d) => d.date)
    .join(', ') || 'our preferred dates'
  
  return `Thank you for your response!

To help us move forward with our decision, could you please provide:

${missingItems.includes('pricing') ? `- Your pricing for a group of ${event?.headcount || 'our expected'} guests` : ''}
${missingItems.includes('availability') ? `- Your availability for ${preferredDates}` : ''}

We're hoping to finalize our vendor selection soon, so we'd appreciate a quick response.

Best regards,
Event Planning Team`
}

function generateClarificationRequest(): string {
  return `Thank you for getting back to us!

I wanted to follow up on your previous message. We want to make sure we fully understand your offering before making a decision.

Could you please clarify:
1. Your availability for our preferred dates
2. Your pricing structure for our group size
3. What's included in your standard package

We appreciate your patience and look forward to your response.

Best regards,
Event Planning Team`
}

function generateGenericFollowUp(event?: Event): string {
  return `Thank you for your response regarding ${event?.name || 'our event inquiry'}.

We're reviewing your information and will get back to you shortly with any additional questions or next steps.

Best regards,
Event Planning Team`
}

// ============================================================================
// Date Utilities
// ============================================================================

/**
 * Check if any vendor dates fall within the flexible window of preferred dates
 */
function checkDateOverlap(
  vendorDates: string[],
  preferredDates: string[],
  flexibilityDays: number
): boolean {
  for (const preferredDateStr of preferredDates) {
    const preferredDate = parseISO(preferredDateStr)
    const startWindow = addDays(preferredDate, -flexibilityDays)
    const endWindow = addDays(preferredDate, flexibilityDays)

    for (const vendorDateStr of vendorDates) {
      try {
        const vendorDate = parseISO(vendorDateStr)
        if (isWithinInterval(vendorDate, { start: startWindow, end: endWindow })) {
          return true
        }
      } catch {
        console.error('Error parsing vendor date:', vendorDateStr)
      }
    }
  }

  return false
}
