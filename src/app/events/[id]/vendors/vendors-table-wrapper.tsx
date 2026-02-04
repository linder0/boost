'use client'

import { useState, useEffect } from 'react'
import { VendorsTable } from '@/components/vendors-table'
import { VendorDrawer } from '@/components/vendor-drawer'
import { VendorsOverviewMap } from '@/components/vendors-overview-map'
import { VendorWithThread, MessageWithParsed } from '@/types/database'
import { getVendorDetail } from '@/app/actions/vendors'

interface VendorsTableWrapperProps {
  vendors: VendorWithThread[]
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
  const [selectedVendor, setSelectedVendor] = useState<VendorWithThread | null>(null)
  const [messages, setMessages] = useState<MessageWithParsed[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (selectedVendor) {
      loadVendorDetail(selectedVendor.id)
    }
  }, [selectedVendor])

  const loadVendorDetail = async (vendorId: string) => {
    setLoading(true)
    try {
      const detail = await getVendorDetail(vendorId)
      const thread = Array.isArray(detail.vendor_threads)
        ? detail.vendor_threads[0]
        : detail.vendor_threads
      setMessages(thread?.messages || [])
    } catch (error) {
      console.error('Failed to load vendor detail:', error)
    } finally {
      setLoading(false)
    }
  }

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
        messages={messages}
        onClose={() => setSelectedVendor(null)}
      />
    </>
  )
}
