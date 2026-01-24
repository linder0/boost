import { discoverVenuesForEvent } from '@/app/actions/vendors'
import { getEvent } from '@/app/actions/events'
import { VenueDiscovery } from './venue-discovery'
import { PAGE_CONTAINER_CLASS } from '@/lib/utils'

export default async function DiscoverVendorsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [event, { venues }] = await Promise.all([
    getEvent(id),
    discoverVenuesForEvent(id),
  ])

  return (
    <div className={PAGE_CONTAINER_CLASS}>
      <VenueDiscovery
        eventId={id}
        eventName={event.name}
        city={event.city}
        headcount={event.headcount}
        budget={event.total_budget}
        venues={venues}
      />
    </div>
  )
}
