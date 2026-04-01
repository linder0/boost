import { Badge } from './ui/badge'
import { VendorStatus, DecisionOutcome, ConfidenceLevel } from '@/types/database'

// ============================================================================
// Variant Helpers (reusable across components)
// ============================================================================

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

export function getStatusVariant(status: VendorStatus): BadgeVariant {
  switch (status) {
    case 'DONE':
    case 'VIABLE':
      return 'default'
    case 'ESCALATION':
      return 'destructive'
    case 'REJECTED':
      return 'outline'
    default:
      return 'secondary'
  }
}

export function getDecisionVariant(decision: DecisionOutcome): BadgeVariant {
  switch (decision) {
    case 'VIABLE':
      return 'default'
    case 'NEGOTIATE':
      return 'secondary'
    case 'REJECT':
      return 'destructive'
    default:
      return 'outline'
  }
}

export function getConfidenceVariant(confidence: ConfidenceLevel | string): BadgeVariant {
  switch (confidence) {
    case 'HIGH':
      return 'default'
    case 'MEDIUM':
      return 'secondary'
    default:
      return 'destructive'
  }
}

export function getSentimentVariant(sentiment: string | null): BadgeVariant {
  switch (sentiment) {
    case 'positive':
      return 'default'
    case 'negative':
      return 'destructive'
    default:
      return 'secondary'
  }
}

// ============================================================================
// Badge Components
// ============================================================================

export function StatusBadge({ status }: { status: VendorStatus }) {
  return <Badge variant={getStatusVariant(status)}>{status.replace('_', ' ')}</Badge>
}

export function DecisionBadge({ decision }: { decision: DecisionOutcome }) {
  return <Badge variant={getDecisionVariant(decision)}>{decision}</Badge>
}

export function ConfidenceBadge({ confidence }: { confidence: ConfidenceLevel }) {
  return <Badge variant={getConfidenceVariant(confidence)}>{confidence}</Badge>
}
