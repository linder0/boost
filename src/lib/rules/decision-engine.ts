import { ParsedVendorResponse } from '@/lib/ai/parser'
import { Event, DecisionOutcome } from '@/types/database'
import { parseISO, isWithinInterval, addDays } from 'date-fns'
import {
  generateRejection,
  generateNegotiation,
  generateConfirmation,
} from '@/lib/templates/auto-responses'

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
    return escalate('Unclear response - manual review needed')
  }

  // Rule 2: Vendor has questions → Escalate
  if (parsed.questions.length > 0) {
    return escalate(`Vendor questions: ${parsed.questions.join('; ')}`)
  }

  // Rule 3: Missing critical info → Escalate
  if (parsed.availability.length === 0 && !parsed.quote) {
    return escalate('Missing both availability and pricing information')
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
      }
    }

    // Between 100% and 115% of flexible budget → Negotiate
    if (parsed.quote.amount > maxBudget && parsed.quote.amount <= maxBudget * 1.15) {
      return {
        outcome: 'NEGOTIATE',
        reason: `Quote $${parsed.quote.amount} is ${Math.round(
          ((parsed.quote.amount - budget) / budget) * 100
        )}% over target budget`,
        proposedNextAction: generateNegotiation(parsed.quote.amount, budget),
        shouldEscalate: false,
        shouldAutoRespond: true,
      }
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
      }
    }
  }

  // Rule 6: Has availability but no quote → Escalate for negotiation
  if (parsed.availability.length > 0 && !parsed.quote) {
    return escalate('Vendor confirmed availability but did not provide pricing')
  }

  // Default: Escalate for manual review
  return escalate('Unable to automatically categorize - needs human review')
}

/**
 * Helper to create an escalation result
 */
function escalate(reason: string): DecisionResult {
  return {
    outcome: 'ESCALATE',
    reason,
    proposedNextAction: null,
    shouldEscalate: true,
    shouldAutoRespond: false,
  }
}

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
