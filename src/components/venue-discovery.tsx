'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PillButton } from '@/components/ui/pill-button'
import { VendorsTable, VendorRow, discoveredToVendorRow } from './vendors-table'
import { createEntitiesFromDiscovery, DiscoveredEntityInput } from '@/app/actions/entities'
import { discoveredRestaurantToEntity } from '@/lib/discovery/utils'
import { DiscoveryLog, LogEntry } from '@/components/discovery-log'
import { CUISINE_TYPES } from '@/lib/entities'
import { NeighborhoodPicker } from '@/components/mapbox'
import { MapPin } from 'lucide-react'

interface VenueDiscoveryProps {
  existingVendorNames?: string[]
}

// Extended restaurant type with discovery metadata
interface DiscoveredRestaurant {
  name: string
  email?: string
  emailConfidence?: number
  category?: string
  city?: string
  neighborhood?: string
  capacityMin?: number
  capacityMax?: number
  priceLevel?: number
  cuisine?: string
  discoverySource?: string
  resyVenueId?: string
  opentableId?: string
  beliRank?: number
  // Location fields
  address?: string
  borough?: string
  // Private dining
  hasPrivateDining?: boolean
  privateDiningCapacityMin?: number
  privateDiningCapacityMax?: number
  privateDiningMinimum?: number
  // Reservation fields
  reservationUrl?: string
  rating?: number
  website?: string
}

// Generate unique ID for logs
let logIdCounter = 0
function generateLogId(): string {
  return `log-${Date.now()}-${logIdCounter++}`
}

// Generate a stable ID for a discovered restaurant
function getRestaurantId(restaurant: DiscoveredRestaurant): string {
  // Prefer email if available, otherwise use name + source
  if (restaurant.email) {
    return restaurant.email
  }
  const normalizedName = restaurant.name.toLowerCase().replace(/[^a-z0-9]/g, '')
  return `${normalizedName}-${restaurant.discoverySource || 'unknown'}`
}

// Discovery source options
const DISCOVERY_SOURCES = [
  { id: 'google_places', label: 'Google', enabled: true },
  { id: 'resy', label: 'Resy', enabled: true },
  { id: 'opentable', label: 'OpenTable', enabled: true },
  { id: 'beli', label: 'Beli', enabled: false }, // Requires Clawdbot
] as const

// Cache key for sessionStorage
const DISCOVERY_CACHE_KEY = 'discovery-cache'

// Cache structure for persisting discovery results
interface DiscoveryCache {
  restaurants: DiscoveredRestaurant[]
  logs: Array<Omit<LogEntry, 'timestamp'> & { timestamp: string }>
  selectedIds: string[]
  filters: {
    selectedSources: string[]
    selectedCuisine: string | null
    selectedNeighborhoods: string[]
  }
  timestamp: number
}

function saveToCache(data: {
  restaurants: DiscoveredRestaurant[]
  logs: LogEntry[]
  selectedIds: Set<string>
  filters: {
    selectedSources: Set<string>
    selectedCuisine: string | null
    selectedNeighborhoods: string[]
  }
}): void {
  try {
    const cache: DiscoveryCache = {
      restaurants: data.restaurants,
      logs: data.logs.map((log) => ({
        ...log,
        timestamp: log.timestamp.toISOString(),
      })),
      selectedIds: Array.from(data.selectedIds),
      filters: {
        selectedSources: Array.from(data.filters.selectedSources),
        selectedCuisine: data.filters.selectedCuisine,
        selectedNeighborhoods: data.filters.selectedNeighborhoods,
      },
      timestamp: Date.now(),
    }
    sessionStorage.setItem(DISCOVERY_CACHE_KEY, JSON.stringify(cache))
  } catch (e) {
    console.error('Failed to save discovery cache:', e)
  }
}

function loadFromCache(): {
  restaurants: DiscoveredRestaurant[]
  logs: LogEntry[]
  selectedIds: Set<string>
  filters: {
    selectedSources: Set<string>
    selectedCuisine: string | null
    selectedNeighborhoods: string[]
  }
} | null {
  try {
    const cached = sessionStorage.getItem(DISCOVERY_CACHE_KEY)
    if (!cached) return null

    const data: DiscoveryCache = JSON.parse(cached)

    // Only use cache if it has results
    if (data.restaurants.length === 0) return null

    return {
      restaurants: data.restaurants,
      logs: data.logs.map((log) => ({
        ...log,
        timestamp: new Date(log.timestamp),
      })),
      selectedIds: new Set(data.selectedIds),
      filters: {
        selectedSources: new Set(data.filters.selectedSources),
        selectedCuisine: data.filters.selectedCuisine,
        selectedNeighborhoods: data.filters.selectedNeighborhoods,
      },
    }
  } catch (e) {
    console.error('Failed to load discovery cache:', e)
    return null
  }
}

export function VenueDiscovery({
  existingVendorNames = [],
}: VenueDiscoveryProps) {
  const existingNamesSet = new Set(existingVendorNames.map(n => n.toLowerCase()))
  const router = useRouter()

  const [restaurants, setRestaurants] = useState<DiscoveredRestaurant[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Discovery state
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [hasDiscovered, setHasDiscovered] = useState(false)

  // Ref to prevent double-execution in React 18 StrictMode
  const discoveryInitiated = useRef(false)

  // Filters
  const [selectedCuisine, setSelectedCuisine] = useState<string | null>(null)
  const [selectedSources, setSelectedSources] = useState<Set<string>>(
    new Set(['google_places', 'resy'])
  )
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>([])
  const [city] = useState('New York') // Default city
  const [partySize] = useState(10) // Default party size

  const addLog = useCallback((message: string, level?: LogEntry['level']) => {
    setLogs((prev) => [
      ...prev,
      {
        id: generateLogId(),
        timestamp: new Date(),
        message,
        level,
      },
    ])
  }, [])

  // On mount: restore from cache or auto-start discovery
  useEffect(() => {
    if (discoveryInitiated.current) return
    discoveryInitiated.current = true

    // Try to restore from cache first
    const cached = loadFromCache()
    if (cached && cached.restaurants.length > 0) {
      setRestaurants(cached.restaurants)
      setLogs(cached.logs)
      setSelectedIds(cached.selectedIds)
      setSelectedSources(cached.filters.selectedSources)
      setSelectedCuisine(cached.filters.selectedCuisine)
      setSelectedNeighborhoods(cached.filters.selectedNeighborhoods)
      setHasDiscovered(true)
      return
    }

    // No cache, start fresh discovery
    startDiscovery()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const startDiscovery = useCallback(async () => {
    setIsDiscovering(true)
    setRestaurants([])
    setSelectedIds(new Set())
    setLogs([])
    setError(null)

    try {
      // Build query params
      const params = new URLSearchParams({
        city,
        partySize: String(partySize),
        sources: Array.from(selectedSources).join(','),
      })
      if (selectedCuisine) {
        params.set('cuisine', selectedCuisine)
      }
      if (selectedNeighborhoods.length > 0) {
        params.set('neighborhoods', selectedNeighborhoods.join(','))
      }

      const response = await fetch(`/api/discover?${params}`)

      if (!response.ok) {
        throw new Error('Failed to start discovery')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response stream')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6))

              switch (event.type) {
                case 'log':
                  addLog(event.message, event.level)
                  break

                case 'venue': {
                  // Add restaurant with deduplication by name
                  const newRestaurant = event.data as DiscoveredRestaurant
                  setRestaurants((prev) => {
                    const nameLower = newRestaurant.name.toLowerCase().replace(/[^a-z0-9]/g, '')

                    const isDuplicate = prev.some((r) => {
                      const existingName = r.name.toLowerCase().replace(/[^a-z0-9]/g, '')
                      return existingName === nameLower
                    })

                    if (isDuplicate) return prev
                    return [...prev, newRestaurant]
                  })
                  break
                }

                case 'venue_updated':
                  setRestaurants((prev) =>
                    prev.map((r) =>
                      r.name === event.data.name ? event.data : r
                    )
                  )
                  break

                case 'complete':
                  setHasDiscovered(true)
                  setRestaurants((currentRestaurants) => {
                    const newSelectedIds = new Set(currentRestaurants.map(getRestaurantId))
                    setSelectedIds(newSelectedIds)
                    // Save to cache with current state
                    setLogs((currentLogs) => {
                      saveToCache({
                        restaurants: currentRestaurants,
                        logs: currentLogs,
                        selectedIds: newSelectedIds,
                        filters: {
                          selectedSources,
                          selectedCuisine,
                          selectedNeighborhoods,
                        },
                      })
                      return currentLogs
                    })
                    return currentRestaurants
                  })
                  break

                case 'error':
                  setError(event.message)
                  break
              }
            } catch (e) {
              console.error('Failed to parse SSE event:', e)
            }
          }
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Discovery failed'
      setError(message)
      addLog(message, 'error')
    } finally {
      setIsDiscovering(false)
    }
  }, [city, partySize, addLog, selectedSources, selectedCuisine, selectedNeighborhoods])

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleAll = () => {
    if (selectedIds.size === restaurants.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(restaurants.map(getRestaurantId)))
    }
  }

  const toggleSource = (sourceId: string) => {
    const newSources = new Set(selectedSources)
    if (newSources.has(sourceId)) {
      if (newSources.size > 1) { // Keep at least one source selected
        newSources.delete(sourceId)
      }
    } else {
      newSources.add(sourceId)
    }
    setSelectedSources(newSources)
  }

  const handleAddRestaurants = async () => {
    if (selectedIds.size === 0) {
      setError('Please select at least one restaurant')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const restaurantsToCreate: DiscoveredEntityInput[] = restaurants
        .filter((r) => selectedIds.has(getRestaurantId(r)))
        .map(discoveredRestaurantToEntity)

      await createEntitiesFromDiscovery(restaurantsToCreate)
      router.push('/')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add restaurants'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  // Convert discovered restaurants to VendorRows for the shared table
  const vendorRows: VendorRow[] = restaurants.map((r) =>
    discoveredToVendorRow(r, existingNamesSet.has(r.name.toLowerCase()))
  )

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Discover Restaurants</h1>
          <p className="text-muted-foreground">
            Find private dining options in {city}
          </p>
        </div>
        <Button
          onClick={startDiscovery}
          disabled={isDiscovering}
          size="lg"
        >
          {isDiscovering ? 'Discovering...' : 'Search Again'}
        </Button>
      </div>

      {/* Filters */}
      <div className="space-y-6">
        {/* Discovery Sources */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Search Sources</label>
          <div className="flex flex-wrap gap-2">
            {DISCOVERY_SOURCES.map((source) => (
              <PillButton
                key={source.id}
                selected={selectedSources.has(source.id)}
                onClick={() => toggleSource(source.id)}
                disabled={!source.enabled || isDiscovering}
              >
                {source.label}
                {!source.enabled && <span className="ml-1 text-xs opacity-50">(soon)</span>}
              </PillButton>
            ))}
          </div>
        </div>

        {/* Cuisine Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Cuisine (optional)</label>
          <div className="flex flex-wrap gap-2">
            <PillButton
              selected={selectedCuisine === null}
              onClick={() => setSelectedCuisine(null)}
              disabled={isDiscovering}
            >
              All
            </PillButton>
            {CUISINE_TYPES.slice(0, 8).map((cuisine) => (
              <PillButton
                key={cuisine}
                selected={selectedCuisine === cuisine}
                onClick={() => setSelectedCuisine(cuisine)}
                disabled={isDiscovering}
              >
                {cuisine}
              </PillButton>
            ))}
          </div>
        </div>

        {/* Neighborhood Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Neighborhood (optional)
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            Click neighborhoods on the map to focus your restaurant search
          </p>
          <NeighborhoodPicker
            selected={selectedNeighborhoods}
            onChange={setSelectedNeighborhoods}
            height="300px"
          />
        </div>
      </div>

      {/* Discovery Log */}
      {(isDiscovering || logs.length > 0) && (
        <DiscoveryLog logs={logs} isActive={isDiscovering} />
      )}

      {/* Results Table */}
      {restaurants.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold">
              {selectedIds.size} of {restaurants.length} selected
              {isDiscovering && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  (streaming...)
                </span>
              )}
            </p>
            <Button variant="ghost" size="sm" onClick={toggleAll}>
              {selectedIds.size === restaurants.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>

          <VendorsTable
            vendors={vendorRows}
            selectedIds={selectedIds}
            onToggleSelection={toggleSelection}
            onToggleAll={toggleAll}
            mode="discovery"
          />

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Action Button */}
          {!isDiscovering && restaurants.length > 0 && (
            <Button
              onClick={handleAddRestaurants}
              disabled={loading || selectedIds.size === 0}
              className="w-full"
            >
              {loading ? 'Adding...' : `Add ${selectedIds.size} Restaurant${selectedIds.size === 1 ? '' : 's'}`}
            </Button>
          )}
        </div>
      )}

      {/* No results state */}
      {!isDiscovering && restaurants.length === 0 && hasDiscovered && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">
            No restaurants found in{' '}
            {selectedNeighborhoods.length > 0
              ? `${selectedNeighborhoods.join(', ')} (${city})`
              : city}
            {selectedCuisine ? ` serving ${selectedCuisine} cuisine` : ''}.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try selecting different neighborhoods, adjusting your filters, or manually import restaurants.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button onClick={() => router.push('/import')}>
              Import CSV
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
