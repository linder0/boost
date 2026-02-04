import { getAllEntities } from '@/app/actions/entities'
import { VenueDiscovery } from '@/components/venue-discovery'
import { PAGE_CONTAINER_CLASS } from '@/lib/utils'

export default async function DiscoverPage() {
  const existingVendors = await getAllEntities()

  // Get names of existing restaurants to mark as already added
  const existingNames = existingVendors.map(v => v.name.toLowerCase())

  return (
    <div className={PAGE_CONTAINER_CLASS}>
      <VenueDiscovery
        existingVendorNames={existingNames}
      />
    </div>
  )
}
