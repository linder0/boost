import { Event, Vendor } from '@/types/database'
import { format } from 'date-fns'

export function generateFollowUp1(event: Event, vendor: Vendor): string {
  return `Hi ${vendor.name} team,

I wanted to follow up on my inquiry from a few days ago regarding ${event.name} in ${event.city}.

We're still in the process of finalizing our vendor selection and would love to hear back from you if you're available and interested.

Quick recap of what we're looking for:
- Event: ${event.name}
- Location: ${event.city}
- Headcount: ${event.headcount} guests
- Preferred dates: ${event.preferred_dates.map((d) => format(new Date(d.date), 'MMMM d, yyyy')).join(', ')}

If you could confirm your availability and provide pricing information, that would be greatly appreciated.

Best regards,
Event Planning Team`
}

export function generateBreakupEmail(event: Event, vendor: Vendor): string {
  return `Hi ${vendor.name} team,

Thank you for your time and consideration regarding our inquiry for ${event.name}.

As we haven't heard back from you, we're moving forward with other vendors who have confirmed their availability.

We appreciate your time and will keep your information on file for future events.

Best regards,
Event Planning Team`
}

export function getFollowUpSubject(event: Event, attempt: number): string {
  if (attempt === 1) {
    return `Following up: ${event.name} - ${event.city}`
  }
  return `Final follow-up: ${event.name}`
}
