import { Badge } from './ui/badge'

// Status badge that works with both old VendorStatus and new EntityStatus
export function StatusBadge({ status }: { status: string }) {
  const upperStatus = status.toUpperCase()

  const variant =
    upperStatus === 'DONE' || upperStatus === 'VIABLE' || upperStatus === 'CONFIRMED'
      ? 'default'
      : upperStatus === 'WAITING' || upperStatus === 'CONTACTED'
      ? 'secondary'
      : upperStatus === 'ESCALATION'
      ? 'destructive'
      : upperStatus === 'REJECTED'
      ? 'outline'
      : 'secondary'

  // Display label mapping
  const displayLabel =
    upperStatus === 'NOT_CONTACTED' || upperStatus === 'DISCOVERED' ? 'Not Contacted' :
    upperStatus === 'WAITING' || upperStatus === 'CONTACTED' ? 'Waiting' :
    upperStatus === 'PARSED' || upperStatus === 'RESPONDED' ? 'Responded' :
    upperStatus === 'ESCALATION' ? 'Escalation' :
    upperStatus === 'VIABLE' || upperStatus === 'CONFIRMED' ? 'Confirmed' :
    upperStatus === 'REJECTED' ? 'Rejected' :
    upperStatus === 'DONE' ? 'Done' :
    status.replace(/_/g, ' ')

  return <Badge variant={variant}>{displayLabel}</Badge>
}

// Decision badge for legacy thread decisions
export function DecisionBadge({ decision }: { decision: string }) {
  const upperDecision = decision.toUpperCase()

  const variant =
    upperDecision === 'VIABLE'
      ? 'default'
      : upperDecision === 'NEGOTIATE'
      ? 'secondary'
      : upperDecision === 'REJECT'
      ? 'destructive'
      : 'outline'

  return <Badge variant={variant}>{decision}</Badge>
}

// Confidence badge for parsing confidence
export function ConfidenceBadge({ confidence }: { confidence: string }) {
  const upperConfidence = confidence.toUpperCase()

  const variant =
    upperConfidence === 'HIGH'
      ? 'default'
      : upperConfidence === 'MEDIUM'
      ? 'secondary'
      : 'destructive'

  return <Badge variant={variant}>{confidence}</Badge>
}
