import { getAllEntities } from '@/app/actions/entities'
import { VendorsPageWrapper } from '@/components/vendors-page-wrapper'
import { PAGE_CONTAINER_CLASS } from '@/lib/utils'

export default async function HomePage() {
  const vendors = await getAllEntities()

  return (
    <div className={PAGE_CONTAINER_CLASS}>
      <VendorsPageWrapper vendors={vendors} />
    </div>
  )
}
