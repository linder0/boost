import { Event, Vendor } from '@/types/database'
import { formatPreferredDates, buildConstraintsList } from '@/lib/utils'

export function generateOutreachEmail(event: Event, vendor: Vendor | { name: string }): string {
  const dates = formatPreferredDates(event.preferred_dates)
  const constraints = buildConstraintsList(event.constraints || {})

  return `Hi ${vendor.name} team,

I'm planning a ${event.name} in ${event.city} and I'm reaching out to check your availability and pricing.

Event Details:
- Expected attendance: ${event.headcount} guests
- Preferred dates (in order of preference):
${dates}
- Budget range: ${event.venue_budget_ceiling > 0 ? `$${event.venue_budget_ceiling.toLocaleString()} for venue` : `$${event.total_budget.toLocaleString()} total`}
${constraints.length > 0 ? `- Requirements: ${constraints.join(', ')}` : ''}

Could you please confirm:
1. Availability for any of the dates listed above
2. Your pricing for a group of ${event.headcount}
3. What's included in your standard package

I'm hoping to make a decision within the next week, so a quick response would be greatly appreciated.

Best regards,
Event Planning Team

---
This is an automated inquiry. If you have any questions or need clarification, please reply to this email.`
}

export function generateOutreachSubject(event: Event): string {
  return `Inquiry: ${event.name} - ${event.headcount} guests in ${event.city}`
}
