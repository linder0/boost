import { getEvent } from '@/app/actions/events'
import { getVendorsByEvent } from '@/app/actions/vendors'
import { VendorsTableWrapper } from './vendors-table-wrapper'
import { PAGE_CONTAINER_CLASS } from '@/lib/utils'

export default async function VendorsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [event, vendors] = await Promise.all([
    getEvent(id),
    getVendorsByEvent(id)
  ])

  return (
    <div className={PAGE_CONTAINER_CLASS}>
      <VendorsTableWrapper
        vendors={vendors}
        eventId={id}
        eventName={event.name}
        city={event.city}
        headcount={event.headcount}
        budget={event.total_budget}
        neighborhoods={event.constraints?.neighborhoods}
        cuisines={event.constraints?.cuisines}
      />
    </div>
  )
}
