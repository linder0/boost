'use client'

import { useState, useCallback, useEffect } from 'react'
import { MapboxMap, MapMarker } from './mapbox-map'
import { AddressSearch } from './address-search'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { reverseGeocode, type LocationData } from '@/lib/mapbox/geocode'

// Re-export LocationData for consumers of this component
export type { LocationData }

interface LocationPickerProps {
  value?: LocationData | null
  onChange: (location: LocationData | null) => void
  label?: string
  placeholder?: string
  showClearButton?: boolean
  showRadius?: boolean
  radiusMiles?: number
  onRadiusChange?: (radius: number) => void
  allowRadiusAdjustment?: boolean
}

export function LocationPicker({
  value,
  onChange,
  label = 'Location',
  placeholder = 'Search for an address...',
  showClearButton = true,
  showRadius = true,
  radiusMiles = 2,
  onRadiusChange,
  allowRadiusAdjustment = true,
}: LocationPickerProps) {
  const [searchValue, setSearchValue] = useState(value?.address || '')
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false)
  const [localRadius, setLocalRadius] = useState(radiusMiles)

  // Sync searchValue with value prop when it changes externally
  useEffect(() => {
    setSearchValue(value?.address || '')
  }, [value?.address])

  // Sync localRadius with radiusMiles prop
  useEffect(() => {
    setLocalRadius(radiusMiles)
  }, [radiusMiles])

  const handleRadiusChange = (values: number[]) => {
    const newRadius = values[0]
    setLocalRadius(newRadius)
    onRadiusChange?.(newRadius)
  }

  const handleSearchSelect = useCallback(
    (result: LocationData) => {
      setSearchValue(result.address)
      onChange(result)
    },
    [onChange]
  )

  const handleMapClick = useCallback(
    async (coords: { lat: number; lng: number }) => {
      setIsReverseGeocoding(true)
      try {
        const locationDetails = await reverseGeocode(coords.lat, coords.lng)
        const address = locationDetails?.address || `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`
        setSearchValue(address)
        onChange({
          address,
          city: locationDetails?.city,
          neighborhood: locationDetails?.neighborhood,
          lat: coords.lat,
          lng: coords.lng,
        })
      } finally {
        setIsReverseGeocoding(false)
      }
    },
    [onChange]
  )

  const handleClear = () => {
    setSearchValue('')
    onChange(null)
  }

  const handleMarkerDrag = useCallback(
    async (_markerId: string, coords: { lat: number; lng: number }) => {
      setIsReverseGeocoding(true)
      try {
        const locationDetails = await reverseGeocode(coords.lat, coords.lng)
        const address = locationDetails?.address || `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`
        setSearchValue(address)
        onChange({
          address,
          city: locationDetails?.city,
          neighborhood: locationDetails?.neighborhood,
          lat: coords.lat,
          lng: coords.lng,
        })
      } finally {
        setIsReverseGeocoding(false)
      }
    },
    [onChange]
  )

  const markers: MapMarker[] = value
    ? [{ id: 'selected', lat: value.lat, lng: value.lng, label: value.address, draggable: true }]
    : []

  const center = value
    ? { lat: value.lat, lng: value.lng }
    : { lat: 40.7128, lng: -74.006 } // Default NYC

  // Convert miles to meters for radius circle
  const radiusMeters = showRadius && value ? localRadius * 1609.34 : undefined

  // Calculate zoom level to fit the radius circle with padding
  // Using formula: zoom ≈ 14.5 - log2(radiusMiles) with adjustments for padding
  const getZoomForRadius = (miles: number, lat: number) => {
    // At zoom 14, roughly 0.5 miles fits in a 250px tall map
    // Each zoom level doubles/halves the visible area
    // We want the diameter (2x radius) to fit with some padding (~70% of map height)
    const baseZoom = 13.5
    const zoomAdjustment = Math.log2(miles)
    const latAdjustment = Math.abs(lat) > 45 ? 0.3 : 0 // Higher latitudes need slight adjustment
    return Math.max(8, Math.min(16, baseZoom - zoomAdjustment - latAdjustment))
  }

  return (
    <div className="space-y-3">
      {label && <Label>{label}</Label>}
      
      <div className="space-y-2">
        <div className="relative">
          <AddressSearch
            onSelect={handleSearchSelect}
            defaultValue={searchValue}
            placeholder={placeholder}
          />
          {isReverseGeocoding && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            </div>
          )}
        </div>
        
        {showClearButton && value && (
          <button
            type="button"
            onClick={handleClear}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Clear location
          </button>
        )}
      </div>

      <MapboxMap
        center={center}
        zoom={value ? getZoomForRadius(localRadius, value.lat) : 10}
        markers={markers}
        clickToSet={true}
        onMapClick={handleMapClick}
        onMarkerDrag={handleMarkerDrag}
        height="250px"
        radiusMeters={radiusMeters}
      />

      {value && showRadius && allowRadiusAdjustment && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Search radius</span>
            <span className="text-sm font-medium">{localRadius} {localRadius === 1 ? 'mile' : 'miles'}</span>
          </div>
          <Slider
            value={[localRadius]}
            onValueChange={handleRadiusChange}
            min={1}
            max={15}
            step={1}
            className="w-full"
          />
        </div>
      )}

      {value && (
        <p className="text-xs text-muted-foreground">
          Drag the marker or click on the map to adjust the location.
        </p>
      )}
    </div>
  )
}
