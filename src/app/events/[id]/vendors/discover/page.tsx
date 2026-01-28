import { getEvent } from '@/app/actions/events'
import { getVendorsByEvent } from '@/app/actions/vendors'
import { VenueDiscovery } from './venue-discovery'
import { PAGE_CONTAINER_CLASS } from '@/lib/utils'

export default async function DiscoverVendorsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [event, existingVendors] = await Promise.all([
    getEvent(id),
    getVendorsByEvent(id)
  ])

  // Get emails of existing vendors to mark as already added
  const existingEmails = existingVendors.map(v => v.contact_email)

  return (
    <div className={PAGE_CONTAINER_CLASS}>
      <VenueDiscovery
        eventId={id}
        eventName={event.name}
        city={event.city}
        headcount={event.headcount}
        budget={event.total_budget}
        existingVendorEmails={existingEmails}
      />
    </div>
  )
}
