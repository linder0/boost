'use client'

import { useState, useCallback, useEffect } from 'react'
import { MapboxMap, MapMarker } from './mapbox-map'
import { AddressSearch } from './address-search'
import { Label } from '@/components/ui/label'
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
}

export function LocationPicker({
  value,
  onChange,
  label = 'Location',
  placeholder = 'Search for an address...',
  showClearButton = true,
  showRadius = true,
  radiusMiles = 2,
}: LocationPickerProps) {
  const [searchValue, setSearchValue] = useState(value?.address || '')
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false)

  // Sync searchValue with value prop when it changes externally
  useEffect(() => {
    setSearchValue(value?.address || '')
  }, [value?.address])

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

  const markers: MapMarker[] = value
    ? [{ id: 'selected', lat: value.lat, lng: value.lng, label: value.address }]
    : []

  const center = value
    ? { lat: value.lat, lng: value.lng }
    : { lat: 40.7128, lng: -74.006 } // Default NYC

  // Convert miles to meters for radius circle
  const radiusMeters = showRadius && value ? radiusMiles * 1609.34 : undefined

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
        zoom={value ? 13 : 10}
        markers={markers}
        clickToSet={true}
        onMapClick={handleMapClick}
        height="250px"
        radiusMeters={radiusMeters}
      />

      {value && (
        <p className="text-xs text-muted-foreground">
          Click on the map to adjust the center point. Showing {radiusMiles} mile radius.
        </p>
      )}
    </div>
  )
}
