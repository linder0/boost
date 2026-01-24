'use client'

import { useCallback, useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'

interface AddressSearchProps {
  onSelect: (result: {
    address: string
    lat: number
    lng: number
  }) => void
  defaultValue?: string
  placeholder?: string
}

interface Suggestion {
  id: string
  place_name: string
  center: [number, number]
}

export function AddressSearch({
  onSelect,
  defaultValue = '',
  placeholder = 'Search for an address...',
}: AddressSearchProps) {
  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
  const [query, setQuery] = useState(defaultValue)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 3 || !accessToken) {
      setSuggestions([])
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true)
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${accessToken}&limit=5&country=US`
        )
        const data = await response.json()
        if (data.features) {
          setSuggestions(
            data.features.map((f: any) => ({
              id: f.id,
              place_name: f.place_name,
              center: f.center,
            }))
          )
          setIsOpen(true)
        }
      } catch (error) {
        console.error('Geocoding error:', error)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query, accessToken])

  const handleSelect = useCallback(
    (suggestion: Suggestion) => {
      const [lng, lat] = suggestion.center
      setQuery(suggestion.place_name)
      setSuggestions([])
      setIsOpen(false)
      onSelect({
        address: suggestion.place_name,
        lat,
        lng,
      })
    },
    [onSelect]
  )

  if (!accessToken) {
    return (
      <div className="p-3 text-sm text-muted-foreground bg-muted rounded-md">
        <p className="font-medium">Mapbox not configured</p>
        <p className="text-xs mt-1">Add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local</p>
      </div>
    )
  }

  return (
    <div className="relative">
      <Input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => suggestions.length > 0 && setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        placeholder={placeholder}
        className="w-full"
      />
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      )}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-auto">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => handleSelect(suggestion)}
            >
              {suggestion.place_name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
