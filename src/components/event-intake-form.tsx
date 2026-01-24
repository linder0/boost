'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Checkbox } from './ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { LocationPicker, LocationData } from './mapbox'
import { createEvent, updateEventSettings } from '@/app/actions/events'
import { Event } from '@/types/database'

const VENUE_TYPES = [
  { id: 'rooftop', label: 'Rooftop' },
  { id: 'restaurant', label: 'Restaurant' },
  { id: 'bar', label: 'Bar' },
  { id: 'cafe', label: 'Cafe' },
  { id: 'wellness', label: 'Wellness' },
  { id: 'lounge', label: 'Lounge' },
]

const TIME_FRAMES = [
  { value: 'morning', label: 'Morning (8am-12pm)' },
  { value: 'afternoon', label: 'Afternoon (12pm-5pm)' },
  { value: 'evening', label: 'Evening (5pm-9pm)' },
  { value: 'night', label: 'Night (9pm+)' },
]

interface EventIntakeFormProps {
  event?: Event
}

export function EventIntakeForm({ event }: EventIntakeFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  
  const isEditMode = !!event

  // Form state - initialize from event if provided
  const [name, setName] = useState(event?.name || '')
  const [city, setCity] = useState(event?.city || '')
  const [neighborhood, setNeighborhood] = useState(event?.constraints?.neighborhood || '')
  const [headcount, setHeadcount] = useState(event?.headcount?.toString() || '')
  const [budget, setBudget] = useState(event?.total_budget?.toString() || '')
  const [dates, setDates] = useState<{ date: string; rank: number }[]>(
    event?.preferred_dates?.length ? event.preferred_dates : [{ date: '', rank: 1 }]
  )
  const [timeFrame, setTimeFrame] = useState<string>(event?.constraints?.time_frame || '')
  const [venueTypes, setVenueTypes] = useState<string[]>(event?.constraints?.venue_types || [])
  const [indoorOutdoor, setIndoorOutdoor] = useState<'indoor' | 'outdoor' | 'either'>(
    event?.constraints?.indoor_outdoor || 'either'
  )
  const [cateringFood, setCateringFood] = useState(event?.constraints?.catering?.food || false)
  const [cateringDrinks, setCateringDrinks] = useState(event?.constraints?.catering?.drinks || false)
  const [externalVendors, setExternalVendors] = useState(
    event?.constraints?.catering?.external_vendors_allowed || false
  )
  const [location, setLocation] = useState<LocationData | null>(
    event?.location_lat && event?.location_lng
      ? {
          address: event.location_address || '',
          lat: event.location_lat,
          lng: event.location_lng,
        }
      : null
  )

  const addDate = () => {
    setDates([...dates, { date: '', rank: dates.length + 1 }])
  }

  const removeDate = (index: number) => {
    setDates(dates.filter((_, i) => i !== index))
  }

  const updateDate = (index: number, date: string) => {
    const newDates = [...dates]
    newDates[index].date = date
    setDates(newDates)
  }

  const toggleVenueType = (venueType: string) => {
    setVenueTypes((prev) =>
      prev.includes(venueType)
        ? prev.filter((v) => v !== venueType)
        : [...prev, venueType]
    )
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSaved(false)

    try {
      const validDates = dates.filter((d) => d.date).map((d, idx) => ({ ...d, rank: idx + 1 }))

      const eventData = {
        name: name.trim() || 'Untitled Event',
        city: city.trim(),
        preferred_dates: validDates,
        headcount: parseInt(headcount) || 0,
        total_budget: parseFloat(budget) || 0,
        venue_budget_ceiling: parseFloat(budget) || 0,
        date_flexibility_days: 0,
        budget_flexibility_percent: 0,
        constraints: {
          neighborhood: neighborhood.trim() || undefined,
          time_frame: (timeFrame || undefined) as 'morning' | 'afternoon' | 'evening' | 'night' | undefined,
          venue_types: venueTypes.length > 0 ? venueTypes : undefined,
          indoor_outdoor: indoorOutdoor,
          catering: {
            food: cateringFood,
            drinks: cateringDrinks,
            external_vendors_allowed: externalVendors,
          },
        },
        location_address: location?.address || null,
        location_lat: location?.lat || null,
        location_lng: location?.lng || null,
      }

      if (isEditMode && event) {
        await updateEventSettings(event.id, eventData)
        setSaved(true)
        router.refresh()
        // Hide saved message after 2 seconds
        setTimeout(() => setSaved(false), 2000)
      } else {
        const newEvent = await createEvent(eventData)
        // Redirect to venue discovery for automated suggestions
        router.push(`/events/${newEvent.id}/vendors/discover`)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save event')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      {!isEditMode && (
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Create New Event</h1>
          <p className="text-muted-foreground">
            Define your event constraints to help automate vendor outreach
          </p>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-8">
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Basic Info</h3>

          <div className="space-y-2">
            <Label htmlFor="name">Event Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Summer Party 2026"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="New York"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="neighborhood">Neighborhood</Label>
              <Input
                id="neighborhood"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="SoHo, Midtown, etc."
              />
            </div>
          </div>

          <LocationPicker
            value={location}
            onChange={setLocation}
            label="Event Location (optional)"
            placeholder="Search for the event venue address..."
          />
        </div>

        {/* Event Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Event Details</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="headcount">Number of People</Label>
              <Input
                id="headcount"
                type="number"
                value={headcount}
                onChange={(e) => setHeadcount(e.target.value)}
                placeholder="50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget">Budget ($)</Label>
              <Input
                id="budget"
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="10000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Preferred Dates</Label>
            {dates.map((date, index) => (
              <div key={index} className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="date"
                    value={date.date}
                    onChange={(e) => updateDate(index, e.target.value)}
                  />
                </div>
                <span className="flex items-center text-sm text-muted-foreground">
                  Rank {date.rank}
                </span>
                {dates.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDate(index)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addDate}>
              Add Another Date
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Time Frame</Label>
            <Select value={timeFrame} onValueChange={setTimeFrame}>
              <SelectTrigger>
                <SelectValue placeholder="Select time of day" />
              </SelectTrigger>
              <SelectContent>
                {TIME_FRAMES.map((tf) => (
                  <SelectItem key={tf.value} value={tf.value}>
                    {tf.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Venue Preferences */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Venue Preferences</h3>

          <div className="space-y-2">
            <Label>Venue Type</Label>
            <div className="flex flex-wrap gap-3">
              {VENUE_TYPES.map((venue) => (
                <div key={venue.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={venue.id}
                    checked={venueTypes.includes(venue.id)}
                    onCheckedChange={() => toggleVenueType(venue.id)}
                  />
                  <Label htmlFor={venue.id} className="font-normal">
                    {venue.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Indoor/Outdoor</Label>
            <Select
              value={indoorOutdoor}
              onValueChange={(value: 'indoor' | 'outdoor' | 'either') =>
                setIndoorOutdoor(value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="either">Either</SelectItem>
                <SelectItem value="indoor">Indoor Only</SelectItem>
                <SelectItem value="outdoor">Outdoor Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Catering */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Catering</h3>

          <div className="flex flex-wrap gap-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="food"
                checked={cateringFood}
                onCheckedChange={(checked) => setCateringFood(checked as boolean)}
              />
              <Label htmlFor="food" className="font-normal">
                Food
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="drinks"
                checked={cateringDrinks}
                onCheckedChange={(checked) => setCateringDrinks(checked as boolean)}
              />
              <Label htmlFor="drinks" className="font-normal">
                Drinks
              </Label>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="external"
              checked={externalVendors}
              onCheckedChange={(checked) => setExternalVendors(checked as boolean)}
            />
            <Label htmlFor="external" className="font-normal">
              Allow external vendors (bring your own catering)
            </Label>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {saved && (
          <div className="rounded-md bg-green-100 p-3 text-sm text-green-800">
            Changes saved successfully!
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading
            ? isEditMode ? 'Saving...' : 'Creating Event...'
            : isEditMode ? 'Save Changes' : 'Create Event'}
        </Button>
      </form>
    </div>
  )
}
