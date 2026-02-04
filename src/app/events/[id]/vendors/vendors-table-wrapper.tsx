'use client'

import { useState } from 'react'
import { VendorsTable } from '@/components/vendors-table'
import { VendorDrawer } from '@/components/vendor-drawer'
import { VendorsOverviewMap } from '@/components/vendors-overview-map'
import { EntityWithStatus } from '@/types/database'

interface VendorsTableWrapperProps {
  vendors: EntityWithStatus[]
  eventId: string
  eventName?: string
  city?: string
  headcount?: number
  budget?: number
  neighborhoods?: string[]
  cuisines?: string[]
}

export function VendorsTableWrapper({
  vendors,
  eventId,
  eventName,
  city,
  headcount,
  budget,
  neighborhoods,
  cuisines,
}: VendorsTableWrapperProps) {
  const [selectedVendor, setSelectedVendor] = useState<EntityWithStatus | null>(null)

  return (
    <>
      <VendorsOverviewMap
        vendors={vendors}
        onVendorClick={setSelectedVendor}
      />

      <VendorsTable
        vendors={vendors}
        eventId={eventId}
        onVendorClick={setSelectedVendor}
        eventName={eventName}
        city={city}
        headcount={headcount}
        budget={budget}
        neighborhoods={neighborhoods}
        cuisines={cuisines}
      />

      <VendorDrawer
        vendor={selectedVendor}
        onClose={() => setSelectedVendor(null)}
      />
    </>
  )
}
