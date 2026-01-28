'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { createVendorsFromDiscovery } from '@/app/actions/vendors'
import { startOutreachForEvent } from '@/app/actions/threads'
import { DemoVenue, demoVenueToVendor } from '@/lib/demo/venues'
import { formatCurrency } from '@/lib/utils'
import { DiscoveredVenue } from '@/lib/discovery'
import { DiscoveryLog, LogEntry } from '@/components/discovery-log'

type VenueItem = DemoVenue | DiscoveredVenue

interface VenueDiscoveryProps {
  eventId: string
  eventName: string
  city: string
  headcount: number
  budget: number
  initialVenues?: VenueItem[]
  discoverySource?: 'google_places' | 'demo'
  existingVendorEmails?: string[]
}

// Type guard to check if a venue is a DiscoveredVenue
function isDiscoveredVenue(venue: VenueItem): venue is DiscoveredVenue {
  return 'discoverySource' in venue
}

// Generate unique ID for logs
let logIdCounter = 0
function generateLogId(): string {
  return `log-${Date.now()}-${logIdCounter++}`
}

export function VenueDiscovery({
  eventId,
  eventName,
  city,
  headcount,
  budget,
  initialVenues = [],
  discoverySource,
  existingVendorEmails = [],
}: VenueDiscoveryProps) {
  // Create a Set for O(1) lookup of existing vendors
  const existingEmailsSet = new Set(existingVendorEmails.map(e => e.toLowerCase()))
  const router = useRouter()
  const [venues, setVenues] = useState<VenueItem[]>(initialVenues)
  const [selectedVenues, setSelectedVenues] = useState<Set<string>>(
    new Set(initialVenues.map((v) => v.email))
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Discovery state
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [hasDiscovered, setHasDiscovered] = useState(initialVenues.length > 0)

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

  // Auto-start discovery when page loads (if no initial venues)
  useEffect(() => {
    if (initialVenues.length === 0 && !hasDiscovered) {
      startDiscovery()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const startDiscovery = useCallback(async () => {
    setIsDiscovering(true)
    setVenues([])
    setSelectedVenues(new Set())
    setLogs([])
    setError(null)

    try {
      const response = await fetch(`/api/discover?eventId=${eventId}`)

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

                case 'venue':
                  setVenues((prev) => [...prev, event.data as DiscoveredVenue])
                  break

                case 'venue_updated':
                  setVenues((prev) =>
                    prev.map((v) =>
                      v.name === event.data.name ? event.data : v
                    )
                  )
                  break

                case 'complete':
                  setHasDiscovered(true)
                  // Select all venues after discovery completes
                  setVenues((currentVenues) => {
                    setSelectedVenues(new Set(currentVenues.map((v) => v.email)))
                    return currentVenues
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
  }, [eventId, addLog, venues])

  const toggleVenue = (email: string) => {
    const newSelected = new Set(selectedVenues)
    if (newSelected.has(email)) {
      newSelected.delete(email)
    } else {
      newSelected.add(email)
    }
    setSelectedVenues(newSelected)
  }

  const toggleAll = () => {
    if (selectedVenues.size === venues.length) {
      setSelectedVenues(new Set())
    } else {
      setSelectedVenues(new Set(venues.map((v) => v.email)))
    }
  }

  const handleAddVendors = async (startOutreach: boolean) => {
    if (selectedVenues.size === 0) {
      setError('Please select at least one venue')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const vendorsToCreate = venues
        .filter((v) => selectedVenues.has(v.email))
        .map(demoVenueToVendor)

      await createVendorsFromDiscovery(eventId, vendorsToCreate)

      if (startOutreach) {
        await startOutreachForEvent(eventId)
      }

      router.push(`/events/${eventId}/vendors`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add vendors'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Discover Venues & Vendors</h1>
            {hasDiscovered && discoverySource === 'google_places' && (
              <Badge variant="default" className="bg-blue-600">
                Google Places
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Find venues and vendors for your event in {city}
          </p>
        </div>
        <Button
          onClick={startDiscovery}
          disabled={isDiscovering}
          size="lg"
        >
          {isDiscovering ? 'Discovering...' : 'Discover'}
        </Button>
      </div>

      {/* Discovery Log - show when discovering or has logs */}
      {(isDiscovering || logs.length > 0) && (
        <DiscoveryLog logs={logs} isActive={isDiscovering} />
      )}

      {/* Venues Table - Grouped by Category */}
      {venues.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold">
              {selectedVenues.size} of {venues.length} selected
              {isDiscovering && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  (streaming...)
                </span>
              )}
            </p>
            <Button variant="ghost" size="sm" onClick={toggleAll}>
              {selectedVenues.size === venues.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
          
          {/* Group venues by category */}
          {(() => {
            // Group venues by category
            const grouped = venues.reduce((acc, venue) => {
              const cat = venue.category || 'Other'
              if (!acc[cat]) acc[cat] = []
              acc[cat].push(venue)
              return acc
            }, {} as Record<string, VenueItem[]>)
            
            // Sort categories: Venue first, then alphabetically
            const sortedCategories = Object.keys(grouped).sort((a, b) => {
              if (a === 'Venue') return -1
              if (b === 'Venue') return 1
              return a.localeCompare(b)
            })
            
            return sortedCategories.map(category => {
              const categoryVenues = grouped[category]
              const categorySelected = categoryVenues.filter(v => selectedVenues.has(v.email)).length
              
              return (
                <div key={category} className="mb-4 last:mb-0">
                  <div className="mb-2 flex items-center gap-2">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      {category}s ({categoryVenues.length})
                    </h4>
                    {categorySelected > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {categorySelected} selected
                      </Badge>
                    )}
                  </div>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={categorySelected === categoryVenues.length}
                              onCheckedChange={() => {
                                const allSelected = categorySelected === categoryVenues.length
                                const newSelected = new Set(selectedVenues)
                                categoryVenues.forEach(v => {
                                  if (allSelected) {
                                    newSelected.delete(v.email)
                                  } else {
                                    newSelected.add(v.email)
                                  }
                                })
                                setSelectedVenues(newSelected)
                              }}
                              aria-label={`Select all ${category}s`}
                            />
                          </TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Contact Email</TableHead>
                          <TableHead>Price Range</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categoryVenues.map((venue, index) => {
                          const isAlreadyAdded = existingEmailsSet.has(venue.email.toLowerCase())
                          return (
                            <TableRow
                              key={`${venue.email}-${index}`}
                              className={`cursor-pointer animate-in fade-in slide-in-from-top-2 duration-300 ${isAlreadyAdded ? 'opacity-60' : ''}`}
                              style={{ animationDelay: `${index * 50}ms` }}
                              onClick={() => !isAlreadyAdded && toggleVenue(venue.email)}
                            >
                              <TableCell>
                                <Checkbox
                                  checked={selectedVenues.has(venue.email)}
                                  onCheckedChange={() => toggleVenue(venue.email)}
                                  disabled={isAlreadyAdded}
                                />
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">{venue.name}</p>
                                    {isDiscoveredVenue(venue) && venue.rating && (
                                      <span className="flex items-center gap-0.5 text-xs text-amber-600">
                                        <span>★</span>
                                        <span>{venue.rating.toFixed(1)}</span>
                                      </span>
                                    )}
                                    {isDiscoveredVenue(venue) && venue.website && (
                                      <a
                                        href={venue.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-blue-600 hover:text-blue-800 text-xs"
                                      >
                                        ↗
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm">{venue.email}</p>
                                  {isDiscoveredVenue(venue) && venue.emailConfidence && (
                                    <Badge
                                      variant={venue.emailConfidence >= 80 ? 'default' : 'secondary'}
                                      className="text-[10px] px-1 py-0"
                                    >
                                      {venue.emailConfidence}%
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                ${venue.pricePerPersonMin}-${venue.pricePerPersonMax}/pp
                              </TableCell>
                              <TableCell>
                                <span className="text-sm">{venue.neighborhood || venue.city}</span>
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
                </div>
              )
            })
          })()}

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Action Buttons - only show when discovery is complete */}
          {!isDiscovering && venues.length > 0 && (
            <>
              <div className="flex gap-3">
                <Button
                  onClick={() => handleAddVendors(true)}
                  disabled={loading || selectedVenues.size === 0}
                  className="flex-1"
                >
                  {loading ? 'Adding...' : `Add ${selectedVenues.size} Venues & Start Outreach`}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleAddVendors(false)}
                  disabled={loading || selectedVenues.size === 0}
                >
                  Add Without Outreach
                </Button>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Starting outreach will automatically send inquiry emails to all selected venues
              </p>
            </>
          )}
        </div>
      )}


      {/* No results state */}
      {!isDiscovering && venues.length === 0 && hasDiscovered && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No venues or vendors found matching your criteria in {city}.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try adjusting your event settings or manually import vendors.
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
