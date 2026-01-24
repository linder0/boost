'use client'

import { useState, useCallback } from 'react'
import { MapboxMap, MapMarker } from './mapbox-map'
import { AddressSearch } from './address-search'
import { Label } from '@/components/ui/label'

export interface LocationData {
  address: string
  lat: number
  lng: number
}

interface LocationPickerProps {
  value?: LocationData | null
  onChange: (location: LocationData | null) => void
  label?: string
  placeholder?: string
  showClearButton?: boolean
}

export function LocationPicker({
  value,
  onChange,
  label = 'Location',
  placeholder = 'Search for an address...',
  showClearButton = true,
}: LocationPickerProps) {
  const [searchValue, setSearchValue] = useState(value?.address || '')

  const handleSearchSelect = useCallback(
    (result: { address: string; lat: number; lng: number }) => {
      setSearchValue(result.address)
      onChange(result)
    },
    [onChange]
  )

  const handleMapClick = useCallback(
    (coords: { lat: number; lng: number }) => {
      // When clicking on map, we keep the address but update coordinates
      // In a full implementation, we could reverse geocode to get the address
      onChange({
        address: value?.address || `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
        lat: coords.lat,
        lng: coords.lng,
      })
    },
    [onChange, value?.address]
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

  return (
    <div className="space-y-3">
      {label && <Label>{label}</Label>}
      
      <div className="space-y-2">
        <AddressSearch
          onSelect={handleSearchSelect}
          defaultValue={searchValue}
          placeholder={placeholder}
        />
        
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
        zoom={value ? 14 : 10}
        markers={markers}
        clickToSet={true}
        onMapClick={handleMapClick}
        height="250px"
      />

      {value && (
        <p className="text-xs text-muted-foreground">
          Click on the map to adjust the pin location
        </p>
      )}
    </div>
  )
}
