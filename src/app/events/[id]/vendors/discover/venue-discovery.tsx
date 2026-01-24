'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

interface VenueDiscoveryProps {
  eventId: string
  eventName: string
  city: string
  headcount: number
  budget: number
  venues: DemoVenue[]
}

export function VenueDiscovery({
  eventId,
  eventName,
  city,
  headcount,
  budget,
  venues,
}: VenueDiscoveryProps) {
  const router = useRouter()
  const [selectedVenues, setSelectedVenues] = useState<Set<string>>(
    new Set(venues.map((v) => v.email)) // Select all by default
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      // Convert selected demo venues to vendor format
      const vendorsToCreate = venues
        .filter((v) => selectedVenues.has(v.email))
        .map(demoVenueToVendor)

      // Create vendors in database
      await createVendorsFromDiscovery(eventId, vendorsToCreate)

      // Optionally start outreach
      if (startOutreach) {
        await startOutreachForEvent(eventId)
      }

      // Navigate to vendors page
      router.push(`/events/${eventId}/vendors`)
    } catch (err: any) {
      setError(err.message || 'Failed to add vendors')
    } finally {
      setLoading(false)
    }
  }

  const perPersonBudget = headcount > 0 ? budget / headcount : 0

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Suggested Venues</h1>
        <p className="text-muted-foreground">
          Based on your event criteria, we found {venues.length} matching venues in {city}
        </p>
      </div>

      {/* Event Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{eventName}</CardTitle>
          <CardDescription>
            {headcount} guests · {formatCurrency(budget)} total budget ·{' '}
            {formatCurrency(Math.round(perPersonBudget))}/person
          </CardDescription>
        </CardHeader>
      </Card>

      {venues.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No venues found matching your criteria in {city}.
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
      ) : (
        <>
          {/* Venues Table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {selectedVenues.size} of {venues.length} selected
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={toggleAll}>
                  {selectedVenues.size === venues.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Venue</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Price Range</TableHead>
                      <TableHead>Location</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {venues.map((venue) => (
                      <TableRow
                        key={venue.email}
                        className="cursor-pointer"
                        onClick={() => toggleVenue(venue.email)}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedVenues.has(venue.email)}
                            onCheckedChange={() => toggleVenue(venue.email)}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{venue.name}</p>
                            <p className="text-sm text-muted-foreground">{venue.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {venue.venueTypes.slice(0, 2).map((type) => (
                              <Badge key={type} variant="secondary" className="text-xs">
                                {type}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {venue.capacityMin}-{venue.capacityMax}
                        </TableCell>
                        <TableCell>
                          ${venue.pricePerPersonMin}-${venue.pricePerPersonMax}/pp
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {venue.neighborhood || venue.city}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Action Buttons */}
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
  )
}
