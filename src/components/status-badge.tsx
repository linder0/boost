import { Badge } from './ui/badge'
import { VendorStatus, DecisionOutcome, ConfidenceLevel } from '@/types/database'

export function StatusBadge({ status }: { status: VendorStatus }) {
  const variant =
    status === 'DONE' || status === 'VIABLE'
      ? 'default'
      : status === 'WAITING'
      ? 'secondary'
      : status === 'ESCALATION'
      ? 'destructive'
      : status === 'REJECTED'
      ? 'outline'
      : 'secondary'

  return <Badge variant={variant}>{status.replace('_', ' ')}</Badge>
}

export function DecisionBadge({ decision }: { decision: DecisionOutcome }) {
  const variant =
    decision === 'VIABLE'
      ? 'default'
      : decision === 'NEGOTIATE'
      ? 'secondary'
      : decision === 'REJECT'
      ? 'destructive'
      : 'outline'

  return <Badge variant={variant}>{decision}</Badge>
}

export function ConfidenceBadge({ confidence }: { confidence: ConfidenceLevel }) {
  const variant =
    confidence === 'HIGH'
      ? 'default'
      : confidence === 'MEDIUM'
      ? 'secondary'
      : 'destructive'

  return <Badge variant={variant}>{confidence}</Badge>
}
