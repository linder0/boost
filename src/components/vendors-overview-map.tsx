'use client'

import { useMemo, useState, useRef } from 'react'
import { MapboxMap, MapMarker, MarkerPosition } from './mapbox'
import { MapPopupCard, MapPopupVendor } from './map-popup-card'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Entity } from '@/types/database'
import { formatPriceLevel } from '@/lib/formatting'

interface VendorsOverviewMapProps {
  vendors: Entity[]
  onVendorClick?: (vendor: Entity) => void
  eventLocation?: { lat: number; lng: number } | null
}

// Convert Entity to popup vendor format
function entityToPopupVendor(entity: Entity): MapPopupVendor {
  return {
    id: entity.id,
    name: entity.name,
    cuisine: entity.metadata?.cuisine,
    rating: entity.metadata?.rating,
    priceLevel: entity.metadata?.price_level,
    capacityMin: entity.metadata?.private_dining_capacity_min,
    capacityMax: entity.metadata?.private_dining_capacity_max,
    neighborhood: entity.neighborhood || undefined,
    address: entity.address || undefined,
    city: entity.city || undefined,
    hasPrivateDining: entity.metadata?.has_private_dining,
    website: entity.website || undefined,
  }
}

export function VendorsOverviewMap({
  vendors,
  onVendorClick,
  eventLocation
}: VendorsOverviewMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [selectedVendor, setSelectedVendor] = useState<Entity | null>(null)
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null)

  // Filter vendors with valid coordinates (now direct columns)
  const vendorsWithLocation = useMemo(() => {
    return vendors.filter(
      (v) => v.latitude != null && v.longitude != null
    )
  }, [vendors])

  // Convert vendors to map markers with Airbnb-style labels
  const markers: MapMarker[] = useMemo(() => {
    return vendorsWithLocation.map((v) => {
      const priceLabel = formatPriceLevel(v.metadata?.price_level) || undefined

      return {
        id: v.id,
        lat: v.latitude!,
        lng: v.longitude!,
        label: v.name,
        priceLabel: priceLabel,
        useCustomMarker: true,
      }
    })
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

  const handleMarkerClick = (markerId: string, position: MarkerPosition) => {
    const vendor = vendors.find((v) => v.id === markerId)
    if (vendor) {
      setSelectedVendor(vendor)
      // Position popup above the marker
      setPopupPosition({ x: position.x, y: position.y })
    }
  }

  const handleClosePopup = () => {
    setSelectedVendor(null)
    setPopupPosition(null)
  }

  const handleViewDetails = () => {
    if (selectedVendor && onVendorClick) {
      onVendorClick(selectedVendor)
      handleClosePopup()
    }
  }

  if (vendorsWithLocation.length === 0) {
    return null
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">
          Venue Locations ({vendorsWithLocation.length} of {vendors.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={mapContainerRef} className="relative">
          {/* Click overlay to close popup when clicking outside */}
          {selectedVendor && (
            <div
              className="absolute inset-0 z-40"
              onClick={handleClosePopup}
            />
          )}

          <MapboxMap
            center={center}
            zoom={11}
            markers={markers}
            selectedMarkerId={selectedVendor?.id}
            onMarkerClick={handleMarkerClick}
            height="400px"
            className="rounded-md"
          />

          {/* Popup card */}
          {selectedVendor && popupPosition && (
            <div
              className="z-50"
              style={{
                position: 'absolute',
                left: popupPosition.x,
                top: popupPosition.y,
                transform: 'translate(-50%, -100%) translateY(-20px)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <MapPopupCard
                vendor={entityToPopupVendor(selectedVendor)}
                onClose={handleClosePopup}
                onViewDetails={handleViewDetails}
              />
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Click on a marker to preview venue details
        </p>
      </CardContent>
    </Card>
  )
}
