'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search } from 'lucide-react'
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
// Note: Outreach is simulated on the vendors page for demo purposes
import { DemoVenue, demoVenueToVendor } from '@/lib/demo/venues'
import { formatCurrency } from '@/lib/utils'
import { DiscoveredVenue } from '@/lib/discovery'
import { DiscoveryLog, LogEntry } from '@/components/discovery-log'
import { sortCategories, groupByCategory, getCategoryLabel, type EntityCategory } from '@/lib/entities'

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
  categoryFilter?: EntityCategory
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
  categoryFilter,
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
      const url = categoryFilter 
        ? `/api/discover?eventId=${eventId}&category=${encodeURIComponent(categoryFilter)}`
        : `/api/discover?eventId=${eventId}`
      const response = await fetch(url)

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
                  // Add venue with deduplication by email and name
                  setVenues((prev) => {
                    const newVenue = event.data as DiscoveredVenue
                    const emailLower = newVenue.email.toLowerCase()
                    const nameLower = newVenue.name.toLowerCase().replace(/[^a-z0-9]/g, '')
                    
                    // Check if we already have this venue
                    const isDuplicate = prev.some((v) => {
                      const existingEmail = v.email.toLowerCase()
                      const existingName = v.name.toLowerCase().replace(/[^a-z0-9]/g, '')
                      return existingEmail === emailLower || existingName === nameLower
                    })
                    
                    if (isDuplicate) {
                      return prev
                    }
                    return [...prev, newVenue]
                  })
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
  }, [eventId, addLog, venues, categoryFilter])

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

      // Note: Outreach is now simulated on the vendors page for demo purposes
      // The startOutreach parameter is ignored - users can click "Start Outreach" 
      // on the vendors page to see the simulation
      
      router.push(`/events/${eventId}/vendors`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add vendors'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  // Dynamic heading based on category filter
  const headingText = categoryFilter 
    ? `Discover ${getCategoryLabel(categoryFilter, true)}`
    : 'Discover Venues & Vendors'
  
  const descriptionText = categoryFilter
    ? `Find ${getCategoryLabel(categoryFilter, true).toLowerCase()} for your event in ${city}`
    : `Find venues and vendors for your event in ${city}`

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{headingText}</h1>
            {hasDiscovered && discoverySource === 'google_places' && (
              <Badge variant="default" className="bg-blue-600">
                Google Places
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {descriptionText}
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
            // Group venues by category using shared utility
            const grouped = groupByCategory(venues)
            
            // Sort categories using shared utility
            const sortedCats = sortCategories(Object.keys(grouped))
            
            return sortedCats.map(category => {
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
                  <Link 
                    href={`/events/${eventId}/vendors/discover?category=${encodeURIComponent(category)}`}
                    className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Search className="h-3.5 w-3.5" />
                    Find more {getCategoryLabel(category as EntityCategory, true).toLowerCase()}
                  </Link>
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
                  {loading ? 'Adding...' : `Add ${selectedVenues.size} ${selectedVenues.size === 1 ? 'Venue' : 'Venues'} & Start Outreach`}
                </Button>
              </div>
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
