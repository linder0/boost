import { getVendorsByEvent } from '@/app/actions/vendors'
import { VendorsTableWrapper } from './vendors-table-wrapper'
import { PAGE_CONTAINER_CLASS } from '@/lib/utils'

export default async function VendorsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const vendors = await getVendorsByEvent(id)

  return (
    <div className={PAGE_CONTAINER_CLASS}>
      <VendorsTableWrapper vendors={vendors} eventId={id} />
    </div>
  )
}
