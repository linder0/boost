'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { PillButton } from '@/components/ui/pill-button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { createVendorsFromDiscovery } from '@/app/actions/vendors'
import { DemoRestaurant, demoRestaurantToVendor, DEMO_RESTAURANTS } from '@/lib/demo/restaurants'
import { DiscoveryLog, LogEntry } from '@/components/discovery-log'
import { CUISINE_TYPES } from '@/lib/entities'
import { NeighborhoodPicker } from '@/components/mapbox'
import { Users, DollarSign, MapPin, ExternalLink } from 'lucide-react'

interface RestaurantDiscoveryProps {
  eventId: string
  eventName: string
  city: string
  headcount: number
  budget: number
  existingVendorEmails?: string[]
  initialNeighborhoods?: string[]
  initialCuisines?: string[]
}

// Extended restaurant type with discovery metadata
interface DiscoveredRestaurant extends DemoRestaurant {
  discoverySource?: string
  resyVenueId?: string
  opentableId?: string
  beliRank?: number
  // Location fields
  address?: string
  borough?: string
  // Reservation fields
  reservationPlatform?: 'resy' | 'opentable' | 'yelp' | 'direct'
  reservationUrl?: string
  hasOnlineReservation?: boolean
}

// Generate unique ID for logs
let logIdCounter = 0
function generateLogId(): string {
  return `log-${Date.now()}-${logIdCounter++}`
}

// Discovery source options
const DISCOVERY_SOURCES = [
  { id: 'google_places', label: 'Google', enabled: true },
  { id: 'resy', label: 'Resy', enabled: true },
  { id: 'opentable', label: 'OpenTable', enabled: true },
  { id: 'beli', label: 'Beli', enabled: false }, // Requires Clawdbot
] as const

export function VenueDiscovery({
  eventId,
  eventName,
  city,
  headcount,
  budget,
  existingVendorEmails = [],
  initialNeighborhoods,
  initialCuisines,
}: RestaurantDiscoveryProps) {
  const existingEmailsSet = new Set(existingVendorEmails.map(e => e.toLowerCase()))
  const router = useRouter()

  const [restaurants, setRestaurants] = useState<DiscoveredRestaurant[]>([])
  const [selectedRestaurants, setSelectedRestaurants] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Discovery state
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [hasDiscovered, setHasDiscovered] = useState(false)

  // Ref to prevent double-execution in React 18 StrictMode
  const discoveryInitiated = useRef(false)

  // Filters - initialize with event preferences if available
  const [selectedCuisine, setSelectedCuisine] = useState<string | null>(
    initialCuisines?.length ? initialCuisines[0] : null
  )
  const [selectedSources, setSelectedSources] = useState<Set<string>>(
    new Set(['google_places', 'resy'])
  )
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>(
    initialNeighborhoods || []
  )

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

  // Auto-start discovery when page loads (with StrictMode protection)
  useEffect(() => {
    if (!hasDiscovered && !discoveryInitiated.current) {
      discoveryInitiated.current = true
      startDiscovery()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const startDiscovery = useCallback(async () => {
    setIsDiscovering(true)
    setRestaurants([])
    setSelectedRestaurants(new Set())
    setLogs([])
    setError(null)

    try {
      // Build query params
      const params = new URLSearchParams({
        eventId,
        sources: Array.from(selectedSources).join(','),
      })
      if (selectedCuisine) {
        params.set('cuisine', selectedCuisine)
      }
      if (selectedNeighborhoods.length > 0) {
        // Pass all selected neighborhoods
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
                  // Add restaurant with deduplication by email and name
                  const newRestaurant = event.data as DiscoveredRestaurant
                  setRestaurants((prev) => {
                    const emailLower = newRestaurant.email.toLowerCase()
                    const nameLower = newRestaurant.name.toLowerCase().replace(/[^a-z0-9]/g, '')

                    const isDuplicate = prev.some((r) => {
                      const existingEmail = r.email.toLowerCase()
                      const existingName = r.name.toLowerCase().replace(/[^a-z0-9]/g, '')
                      return existingEmail === emailLower || existingName === nameLower
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
                  setRestaurants((current) => {
                    setSelectedRestaurants(new Set(current.map((r) => r.email)))
                    return current
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
  }, [eventId, addLog, selectedSources, selectedCuisine, selectedNeighborhoods])

  const toggleRestaurant = (email: string) => {
    const newSelected = new Set(selectedRestaurants)
    if (newSelected.has(email)) {
      newSelected.delete(email)
    } else {
      newSelected.add(email)
    }
    setSelectedRestaurants(newSelected)
  }

  const toggleAll = () => {
    if (selectedRestaurants.size === restaurants.length) {
      setSelectedRestaurants(new Set())
    } else {
      setSelectedRestaurants(new Set(restaurants.map((r) => r.email)))
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
    if (selectedRestaurants.size === 0) {
      setError('Please select at least one restaurant')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const restaurantsToCreate = restaurants
        .filter((r) => selectedRestaurants.has(r.email))
        .map(demoRestaurantToVendor)

      await createVendorsFromDiscovery(eventId, restaurantsToCreate)
      router.push(`/events/${eventId}/vendors`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add restaurants'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  // Format capacity display
  const formatCapacity = (restaurant: DiscoveredRestaurant): string => {
    const min = restaurant.privateDiningCapacityMin
    const max = restaurant.privateDiningCapacityMax
    if (min && max) return `${min}-${max}`
    if (max) return `${max}`
    return `${restaurant.capacityMin}-${restaurant.capacityMax}`
  }

  // Format minimum spend display
  const formatMinimum = (restaurant: DiscoveredRestaurant): string => {
    const min = restaurant.privateDiningMinimum
    if (!min) return '-'
    return `$${min.toLocaleString()}`
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Discover Restaurants</h1>
          <p className="text-muted-foreground">
            Find private dining options in {city} for {headcount} guests
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
      <Card>
        <CardContent className="pt-4 space-y-4">
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
        </CardContent>
      </Card>

      {/* Discovery Log */}
      {(isDiscovering || logs.length > 0) && (
        <DiscoveryLog logs={logs} isActive={isDiscovering} />
      )}

      {/* Results Table */}
      {restaurants.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold">
              {selectedRestaurants.size} of {restaurants.length} selected
              {isDiscovering && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  (streaming...)
                </span>
              )}
            </p>
            <Button variant="ghost" size="sm" onClick={toggleAll}>
              {selectedRestaurants.size === restaurants.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedRestaurants.size === restaurants.length}
                      onCheckedChange={toggleAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Restaurant</TableHead>
                  <TableHead>Cuisine</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Minimum</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {restaurants.map((restaurant, index) => {
                  const isAlreadyAdded = existingEmailsSet.has(restaurant.email.toLowerCase())
                  return (
                    <TableRow
                      key={`${restaurant.email}-${index}`}
                      className={`cursor-pointer animate-in fade-in slide-in-from-top-2 duration-300 ${isAlreadyAdded ? 'opacity-60' : ''}`}
                      style={{ animationDelay: `${index * 50}ms` }}
                      onClick={() => !isAlreadyAdded && toggleRestaurant(restaurant.email)}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedRestaurants.has(restaurant.email)}
                          onCheckedChange={() => toggleRestaurant(restaurant.email)}
                          disabled={isAlreadyAdded}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{restaurant.name}</span>
                            {restaurant.hasPrivateDining && (
                              <Badge variant="outline" className="text-xs">
                                Private Dining
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{'$'.repeat(restaurant.priceLevel || 3)}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{restaurant.cuisine || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm">{formatCapacity(restaurant)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm">{formatMinimum(restaurant)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <span className="text-sm">
                            {restaurant.neighborhood || restaurant.borough || restaurant.city}
                          </span>
                          {restaurant.address && (
                            <span
                              className="text-xs text-muted-foreground block truncate max-w-[150px]"
                              title={restaurant.address}
                            >
                              {restaurant.address.split(',')[0]}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {restaurant.discoverySource && (
                            <Badge variant="secondary" className="text-xs">
                              {restaurant.discoverySource === 'google_places' ? 'Google' :
                               restaurant.discoverySource === 'resy' ? 'Resy' :
                               restaurant.discoverySource === 'opentable' ? 'OpenTable' :
                               restaurant.discoverySource === 'beli' ? 'Beli' :
                               restaurant.discoverySource}
                            </Badge>
                          )}
                          {restaurant.beliRank && (
                            <Badge variant="outline" className="text-xs">
                              #{restaurant.beliRank}
                            </Badge>
                          )}
                          {restaurant.reservationUrl && (
                            <a
                              href={restaurant.reservationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-muted-foreground hover:text-foreground"
                              title="Book on Resy"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isAlreadyAdded ? (
                          <Badge variant="outline" className="text-green-600 border-green-300">
                            Added
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">New</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Action Button */}
          {!isDiscovering && restaurants.length > 0 && (
            <Button
              onClick={handleAddRestaurants}
              disabled={loading || selectedRestaurants.size === 0}
              className="w-full"
            >
              {loading ? 'Adding...' : `Add ${selectedRestaurants.size} Restaurant${selectedRestaurants.size === 1 ? '' : 's'}`}
            </Button>
          )}
        </div>
      )}

      {/* No results state */}
      {!isDiscovering && restaurants.length === 0 && hasDiscovered && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No restaurants found for {headcount} guests in{' '}
              {selectedNeighborhoods.length > 0
                ? `${selectedNeighborhoods.join(', ')} (${city})`
                : city}
              {budget ? ` with a $${budget.toLocaleString()} budget` : ''}
              {selectedCuisine ? ` serving ${selectedCuisine} cuisine` : ''}.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try selecting different neighborhoods, adjusting your filters, or manually import restaurants.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="outline" onClick={() => router.push(`/events/${eventId}`)}>
                Edit Event
              </Button>
              <Button onClick={() => router.push(`/events/${eventId}/vendors/import`)}>
                Import CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
