'use client'

import { useMemo } from 'react'
import { MapboxMap, MapMarker } from './mapbox'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { VendorWithThread } from '@/types/database'

interface VendorsOverviewMapProps {
  vendors: VendorWithThread[]
  onVendorClick?: (vendor: VendorWithThread) => void
  eventLocation?: { lat: number; lng: number } | null
}

export function VendorsOverviewMap({ 
  vendors, 
  onVendorClick,
  eventLocation 
}: VendorsOverviewMapProps) {
  // Filter vendors with valid coordinates
  const vendorsWithLocation = useMemo(() => {
    return vendors.filter(
      (v) => v.latitude != null && v.longitude != null
    )
  }, [vendors])

  // Convert vendors to map markers
  const markers: MapMarker[] = useMemo(() => {
    return vendorsWithLocation.map((v) => ({
      id: v.id,
      lat: v.latitude!,
      lng: v.longitude!,
      label: v.name,
      color: '#3b82f6', // Blue for vendors
    }))
  }, [vendorsWithLocation])

  // Calculate center - use event location, first vendor, or default to NYC
  const center = useMemo(() => {
    if (eventLocation) {
      return eventLocation
    }
    if (vendorsWithLocation.length > 0) {
      // Calculate centroid of all vendor locations
      const sumLat = vendorsWithLocation.reduce((sum, v) => sum + v.latitude!, 0)
      const sumLng = vendorsWithLocation.reduce((sum, v) => sum + v.longitude!, 0)
      return {
        lat: sumLat / vendorsWithLocation.length,
        lng: sumLng / vendorsWithLocation.length,
      }
    }
    return { lat: 40.7128, lng: -74.006 } // NYC default
  }, [vendorsWithLocation, eventLocation])

  const handleMarkerClick = (markerId: string) => {
    const vendor = vendors.find((v) => v.id === markerId)
    if (vendor && onVendorClick) {
      onVendorClick(vendor)
    }
  }

  if (vendorsWithLocation.length === 0) {
    return null
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">
          Vendor Locations ({vendorsWithLocation.length} of {vendors.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <MapboxMap
          center={center}
          zoom={11}
          markers={markers}
          onMarkerClick={handleMarkerClick}
          height="350px"
          className="rounded-md"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Click on a marker to view vendor details
        </p>
      </CardContent>
    </Card>
  )
}
