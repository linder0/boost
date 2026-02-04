import { getEvent } from '@/app/actions/events'
import { getEntitiesByEvent } from '@/app/actions/entities'
import { VendorsTableWrapper } from './vendors-table-wrapper'
import { PAGE_CONTAINER_CLASS } from '@/lib/utils'

export default async function VendorsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [event, vendors] = await Promise.all([
    getEvent(id),
    getEntitiesByEvent(id)
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
