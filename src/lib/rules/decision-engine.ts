import { ParsedVendorResponse } from '@/lib/ai/parser'
import { Event, DecisionOutcome } from '@/types/database'
import { parseISO, isWithinInterval, addDays } from 'date-fns'

export interface DecisionResult {
  outcome: DecisionOutcome
  reason: string
  proposedNextAction: string | null
  shouldEscalate: boolean
  shouldAutoRespond: boolean
}

export function evaluateVendor(
  parsed: ParsedVendorResponse,
  eventConstraints: Event
): DecisionResult {
  // Rule 1: Low confidence parse → Escalate
  if (parsed.confidence === 'low') {
    return {
      outcome: 'ESCALATE',
      reason: 'Unclear response - manual review needed',
      proposedNextAction: null,
      shouldEscalate: true,
      shouldAutoRespond: false,
    }
  }

  // Rule 2: Vendor has questions → Escalate
  if (parsed.questions.length > 0) {
    return {
      outcome: 'ESCALATE',
      reason: `Vendor questions: ${parsed.questions.join('; ')}`,
      proposedNextAction: null,
      shouldEscalate: true,
      shouldAutoRespond: false,
    }
  }

  // Rule 3: Missing critical info → Escalate
  if (parsed.availability.length === 0 && !parsed.quote) {
    return {
      outcome: 'ESCALATE',
      reason: 'Missing both availability and pricing information',
      proposedNextAction: null,
      shouldEscalate: true,
      shouldAutoRespond: false,
    }
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
        proposedNextAction: generateRejectionMessage('date mismatch'),
        shouldEscalate: false,
        shouldAutoRespond: true,
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
        proposedNextAction: generateRejectionMessage('budget'),
        shouldEscalate: false,
        shouldAutoRespond: true,
      }
    }

    // Between 100% and 115% of flexible budget → Negotiate
    if (parsed.quote.amount > maxBudget && parsed.quote.amount <= maxBudget * 1.15) {
      return {
        outcome: 'NEGOTIATE',
        reason: `Quote $${parsed.quote.amount} is ${Math.round(
          ((parsed.quote.amount - budget) / budget) * 100
        )}% over target budget`,
        proposedNextAction: generateNegotiationMessage(parsed.quote.amount, budget),
        shouldEscalate: false,
        shouldAutoRespond: true,
      }
    }

    // Within budget and has availability → Viable
    if (parsed.quote.amount <= maxBudget && parsed.availability.length > 0) {
      return {
        outcome: 'VIABLE',
        reason: `Quote within budget ($${parsed.quote.amount}) and dates available`,
        proposedNextAction: generateConfirmationMessage(parsed),
        shouldEscalate: false,
        shouldAutoRespond: false, // Human should review before confirming
      }
    }
  }

  // Rule 6: Has availability but no quote → Escalate for negotiation
  if (parsed.availability.length > 0 && !parsed.quote) {
    return {
      outcome: 'ESCALATE',
      reason: 'Vendor confirmed availability but did not provide pricing',
      proposedNextAction: null,
      shouldEscalate: true,
      shouldAutoRespond: false,
    }
  }

  // Default: Escalate for manual review
  return {
    outcome: 'ESCALATE',
    reason: 'Unable to automatically categorize - needs human review',
    proposedNextAction: null,
    shouldEscalate: true,
    shouldAutoRespond: false,
  }
}

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
        if (
          isWithinInterval(vendorDate, { start: startWindow, end: endWindow })
        ) {
          return true
        }
      } catch (error) {
        console.error('Error parsing vendor date:', vendorDateStr)
      }
    }
  }

  return false
}

function generateRejectionMessage(reason: 'date mismatch' | 'budget'): string {
  if (reason === 'date mismatch') {
    return `Thank you for your response. Unfortunately, your available dates don't align with our event timeline. We appreciate your time and will keep you in mind for future events.`
  }

  return `Thank you for providing your quote. After reviewing our budget, we've decided to move forward with other options that better fit our financial constraints. We appreciate your time and consideration.`
}

function generateNegotiationMessage(currentQuote: number, targetBudget: number): string {
  return `Thank you for your quote of $${currentQuote.toLocaleString()}. We're very interested in your services, but our budget for this component is closer to $${targetBudget.toLocaleString()}. Is there any flexibility in your pricing, or perhaps a scaled-down package that could fit within our budget? We'd love to work with you if possible.`
}

function generateConfirmationMessage(parsed: ParsedVendorResponse): string {
  const dates = parsed.availability.map((a) => a.date).join(', ')
  return `Thank you for confirming your availability and providing pricing. Your quote of $${
    parsed.quote?.amount.toLocaleString() || 'TBD'
  } works within our budget. We're interested in moving forward and would like to discuss next steps. Available dates you mentioned: ${dates}. Could you provide any additional details about the booking process?`
}
