import { getVendorsByEvent } from '@/app/actions/vendors'
import { getEvent } from '@/app/actions/events'
import { VendorsTableWrapper } from './vendors-table-wrapper'
import { PAGE_CONTAINER_CLASS, formatCurrency } from '@/lib/utils'

export default async function VendorsPage({ params }: { params: { id: string } }) {
  const { id } = await Promise.resolve(params)
  
  const [event, vendors] = await Promise.all([
    getEvent(id),
    getVendorsByEvent(id),
  ])

  return (
    <div className={PAGE_CONTAINER_CLASS}>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{event.name}</h1>
        <p className="text-muted-foreground">
          {event.city} • {event.headcount} guests • {formatCurrency(event.total_budget)} budget
        </p>
      </div>

      <VendorsTableWrapper vendors={vendors} eventId={id} />
    </div>
  )
}
