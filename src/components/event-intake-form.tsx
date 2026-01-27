'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { Textarea } from './ui/textarea'
import { LocationPicker, LocationData } from './mapbox'
import { VendorRow, VendorRowState, PillOptions } from './vendor-row'
import { 
  Building2, 
  UtensilsCrossed, 
  Camera, 
  Video, 
  Music, 
  Flower2, 
  Armchair, 
  Car, 
  Users,
} from 'lucide-react'
import { createEvent, updateEventSettings } from '@/app/actions/events'
import { Event } from '@/types/database'

// ============================================================================
// Constants
// ============================================================================

const VENDOR_CATEGORIES = [
  { id: 'catering', label: 'Catering', icon: UtensilsCrossed, placeholder: 'Dietary requirements, cuisine, service style...' },
  { id: 'photography', label: 'Photography', icon: Camera, placeholder: 'Photo style, must-have shots, coverage hours...' },
  { id: 'videography', label: 'Videography', icon: Video, placeholder: 'Video style, deliverables, drone footage...' },
  { id: 'entertainment', label: 'Entertainment / DJ', icon: Music, placeholder: 'Music genre, live band vs DJ, MC services...' },
  { id: 'florals', label: 'Florals / Decor', icon: Flower2, placeholder: 'Color scheme, flower preferences, centerpieces...' },
  { id: 'rentals', label: 'Rentals', icon: Armchair, placeholder: 'Tables, chairs, linens, AV, lighting, tents...' },
  { id: 'transportation', label: 'Transportation', icon: Car, placeholder: 'Shuttle, limo, party bus, guest count...' },
  { id: 'staffing', label: 'Event Staffing', icon: Users, placeholder: 'Bartenders, servers, security, coordinators...' },
] as const

const VENUE_TYPES = [
  { value: 'rooftop', label: 'Rooftop' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'bar', label: 'Bar' },
  { value: 'cafe', label: 'Cafe' },
  { value: 'wellness', label: 'Wellness' },
  { value: 'lounge', label: 'Lounge' },
] as const

const INDOOR_OUTDOOR_OPTIONS = [
  { value: 'indoor' as const, label: 'Indoor' },
  { value: 'outdoor' as const, label: 'Outdoor' },
  { value: 'either' as const, label: 'Either' },
]

const TIME_FRAMES = [
  { value: 'morning', label: 'Morning (8am-12pm)' },
  { value: 'afternoon', label: 'Afternoon (12pm-5pm)' },
  { value: 'evening', label: 'Evening (5pm-9pm)' },
  { value: 'night', label: 'Night (9pm+)' },
] as const

// ============================================================================
// Types
// ============================================================================

interface EventIntakeFormProps {
  event?: Event
}

type VendorStates = Record<string, VendorRowState>
type VendorNotes = Record<string, string>

// ============================================================================
// Helpers
// ============================================================================

function getInitialVendorStates(event?: Event): VendorStates {
  const states: VendorStates = {}
  VENDOR_CATEGORIES.forEach(cat => {
    if (event?.constraints?.vendor_categories?.includes(cat.id)) {
      states[cat.id] = 'need'
    } else if (event?.constraints?.already_have_categories?.includes(cat.id)) {
      states[cat.id] = 'have'
    } else {
      states[cat.id] = 'none'
    }
  })
  return states
}

function getInitialVendorNotes(event?: Event): VendorNotes {
  const notes: VendorNotes = {}
  VENDOR_CATEGORIES.forEach(cat => {
    notes[cat.id] = event?.constraints?.vendor_notes?.[cat.id] 
      || event?.constraints?.already_have_notes?.[cat.id] 
      || ''
  })
  return notes
}

function getVenueState(event?: Event): VendorRowState {
  if (event?.constraints?.needs_venue) return 'need'
  if (event?.constraints?.already_have_venue) return 'have'
  return 'none'
}

// ============================================================================
// Component
// ============================================================================

export function EventIntakeForm({ event }: EventIntakeFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  
  const isEditMode = !!event

  // Basic info
  const [name, setName] = useState(event?.name || '')
  const [description, setDescription] = useState(event?.description || '')
  const [headcount, setHeadcount] = useState(event?.headcount?.toString() || '')
  const [budget, setBudget] = useState(event?.total_budget?.toString() || '')
  const [dates, setDates] = useState<{ date: string; rank: number }[]>(
    event?.preferred_dates?.length ? event.preferred_dates : [{ date: '', rank: 1 }]
  )
  const [timeFrame, setTimeFrame] = useState<string>(event?.constraints?.time_frame || '')
  const [location, setLocation] = useState<LocationData | null>(
    event?.location_lat && event?.location_lng
      ? {
          address: event.location_address || '',
          lat: event.location_lat,
          lng: event.location_lng,
          city: event.city || undefined,
          neighborhood: event.constraints?.neighborhood || undefined,
        }
      : null
  )
  const [searchRadius, setSearchRadius] = useState(event?.constraints?.search_radius_miles || 2)

  // Venue state
  const [venueState, setVenueState] = useState<VendorRowState>(getVenueState(event))
  const [venueNotes, setVenueNotes] = useState(
    event?.constraints?.venue_notes || event?.constraints?.already_have_venue_notes || ''
  )
  const [venueTypes, setVenueTypes] = useState<string[]>(event?.constraints?.venue_types || [])
  const [indoorOutdoor, setIndoorOutdoor] = useState<'indoor' | 'outdoor' | 'either'>(
    event?.constraints?.indoor_outdoor || 'either'
  )

  // Vendor states (consolidated)
  const [vendorStates, setVendorStates] = useState<VendorStates>(getInitialVendorStates(event))
  const [vendorNotes, setVendorNotes] = useState<VendorNotes>(getInitialVendorNotes(event))

  // ============================================================================
  // Handlers
  // ============================================================================

  const addDate = () => setDates([...dates, { date: '', rank: dates.length + 1 }])
  const removeDate = (index: number) => setDates(dates.filter((_, i) => i !== index))
  const updateDate = (index: number, date: string) => {
    const newDates = [...dates]
    newDates[index].date = date
    setDates(newDates)
  }

  const toggleVenueType = (venueType: string) => {
    setVenueTypes(prev =>
      prev.includes(venueType) ? prev.filter(v => v !== venueType) : [...prev, venueType]
    )
  }

  const updateVendorState = (id: string, state: VendorRowState) => {
    setVendorStates(prev => ({ ...prev, [id]: state }))
  }

  const updateVendorNotes = (id: string, notes: string) => {
    setVendorNotes(prev => ({ ...prev, [id]: notes }))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSaved(false)

    try {
      const validDates = dates.filter(d => d.date).map((d, idx) => ({ ...d, rank: idx + 1 }))
      
      // Build vendor arrays from state
      const needCategories = Object.entries(vendorStates)
        .filter(([, state]) => state === 'need')
        .map(([id]) => id)
      const haveCategories = Object.entries(vendorStates)
        .filter(([, state]) => state === 'have')
        .map(([id]) => id)
      
      // Build notes objects
      const needNotes: VendorNotes = {}
      const haveNotes: VendorNotes = {}
      Object.entries(vendorNotes).forEach(([id, notes]) => {
        if (notes.trim()) {
          if (vendorStates[id] === 'need') needNotes[id] = notes.trim()
          if (vendorStates[id] === 'have') haveNotes[id] = notes.trim()
        }
      })

      const eventData = {
        name: name.trim() || 'Untitled Event',
        description: description.trim() || null,
        city: location?.city?.trim() || '',
        preferred_dates: validDates,
        headcount: parseInt(headcount) || 0,
        total_budget: parseFloat(budget) || 0,
        venue_budget_ceiling: parseFloat(budget) || 0,
        date_flexibility_days: 0,
        budget_flexibility_percent: 0,
        constraints: {
          needs_venue: venueState === 'need',
          venue_notes: venueState === 'need' && venueNotes.trim() ? venueNotes.trim() : undefined,
          already_have_venue: venueState === 'have',
          already_have_venue_notes: venueState === 'have' && venueNotes.trim() ? venueNotes.trim() : undefined,
          vendor_categories: needCategories.length > 0 ? needCategories : undefined,
          vendor_notes: Object.keys(needNotes).length > 0 ? needNotes : undefined,
          already_have_categories: haveCategories.length > 0 ? haveCategories : undefined,
          already_have_notes: Object.keys(haveNotes).length > 0 ? haveNotes : undefined,
          neighborhood: location?.neighborhood?.trim() || undefined,
          time_frame: (timeFrame || undefined) as 'morning' | 'afternoon' | 'evening' | 'night' | undefined,
          venue_types: venueState === 'need' && venueTypes.length > 0 ? venueTypes : undefined,
          indoor_outdoor: venueState === 'need' ? indoorOutdoor : undefined,
          search_radius_miles: searchRadius,
        },
        location_address: location?.address || null,
        location_lat: location?.lat || null,
        location_lng: location?.lng || null,
      }

      if (isEditMode && event) {
        await updateEventSettings(event.id, eventData)
        setSaved(true)
        router.refresh()
        setTimeout(() => setSaved(false), 2000)
      } else {
        const newEvent = await createEvent(eventData)
        router.push(`/events/${newEvent.id}/vendors/discover`)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save event')
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // Render
  // ============================================================================

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
        {/* About Your Event */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">About Your Event</h3>

          <div className="space-y-2">
            <Label htmlFor="name">Event Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Summer Party 2026"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your event to help personalize vendor outreach..."
              className="min-h-[80px]"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Date</Label>
              {dates.map((date, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="date"
                    value={date.date}
                    onChange={(e) => updateDate(index, e.target.value)}
                    className="flex-1"
                  />
                  {dates.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeDate(index)}>
                      ×
                    </Button>
                  )}
                </div>
              ))}
              {dates.length < 3 && (
                <Button type="button" variant="ghost" size="sm" onClick={addDate} className="text-muted-foreground">
                  + Add backup date
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <Label>Time of Day</Label>
              <Select value={timeFrame} onValueChange={setTimeFrame}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="headcount">Number of Guests</Label>
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

          <LocationPicker
            value={location}
            onChange={setLocation}
            label="Location"
            placeholder="Search for a venue, neighborhood, or city..."
            radiusMiles={searchRadius}
            onRadiusChange={setSearchRadius}
          />
        </div>

        {/* Venue & Vendors */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Venue & Vendors</h3>
            <p className="text-sm text-muted-foreground">
              Select what you need help finding vs. what you already have booked
            </p>
          </div>

          <div className="space-y-2">
            {/* Venue Row */}
            <VendorRow
              icon={Building2}
              label="Venue"
              state={venueState}
              onStateChange={setVenueState}
              notes={venueNotes}
              onNotesChange={setVenueNotes}
              placeholder="Describe your ideal venue... (capacity, vibe, must-haves)"
              havePlaceholder="Venue name and any details about the space..."
            >
              <div className="flex flex-wrap items-center gap-2">
                <PillOptions
                  options={VENUE_TYPES.map(v => ({ value: v.value, label: v.label }))}
                  selected={venueTypes}
                  onChange={toggleVenueType}
                  multi
                />
                <span className="text-muted-foreground">|</span>
                <PillOptions
                  options={INDOOR_OUTDOOR_OPTIONS}
                  selected={indoorOutdoor}
                  onChange={setIndoorOutdoor}
                />
              </div>
            </VendorRow>

            {/* Vendor Category Rows */}
            {VENDOR_CATEGORIES.map((category) => (
              <VendorRow
                key={category.id}
                icon={category.icon}
                label={category.label}
                state={vendorStates[category.id]}
                onStateChange={(state) => updateVendorState(category.id, state)}
                notes={vendorNotes[category.id]}
                onNotesChange={(notes) => updateVendorNotes(category.id, notes)}
                placeholder={category.placeholder}
              />
            ))}
          </div>
        </div>

        {/* Messages */}
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
