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
import { Textarea } from './ui/textarea'
import { PillButton } from './ui/pill-button'
import { NeighborhoodPicker } from './mapbox'
import { CUISINE_TYPES } from '@/lib/entities'
import { createEvent, updateEventSettings } from '@/app/actions/events'
import { Event } from '@/types/database'

// ============================================================================
// Constants
// ============================================================================

const TIME_FRAMES = [
  { value: 'evening', label: 'Evening (5pm-9pm)' },
  { value: 'night', label: 'Night (9pm+)' },
  { value: 'afternoon', label: 'Afternoon (12pm-5pm)' },
  { value: 'morning', label: 'Morning (8am-12pm)' },
] as const

const PARTY_SIZES = [
  { value: 'small', label: '10-20 guests', min: 10, max: 20 },
  { value: 'medium', label: '20-40 guests', min: 20, max: 40 },
  { value: 'large', label: '40-75 guests', min: 40, max: 75 },
  { value: 'xlarge', label: '75+ guests', min: 75, max: 200 },
] as const

// ============================================================================
// Types
// ============================================================================

interface EventIntakeFormProps {
  event?: Event
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
  const [timeFrame, setTimeFrame] = useState<string>(event?.constraints?.time_frame || 'evening')
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>(
    event?.constraints?.neighborhoods || []
  )

  // Restaurant-specific preferences
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(
    event?.constraints?.cuisines || []
  )
  const [requiresPrivateDining, setRequiresPrivateDining] = useState(
    event?.constraints?.requires_private_dining ?? true
  )
  const [dietaryRestrictions, setDietaryRestrictions] = useState(
    event?.constraints?.dietary_restrictions || ''
  )

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

  const toggleCuisine = (cuisine: string) => {
    setSelectedCuisines(prev =>
      prev.includes(cuisine) ? prev.filter(c => c !== cuisine) : [...prev, cuisine]
    )
  }

  const toggleNeighborhood = (neighborhood: string) => {
    setSelectedNeighborhoods(prev =>
      prev.includes(neighborhood) ? prev.filter(n => n !== neighborhood) : [...prev, neighborhood]
    )
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSaved(false)

    try {
      const validDates = dates.filter(d => d.date).map((d, idx) => ({ ...d, rank: idx + 1 }))

      const eventData = {
        name: name.trim() || 'Dinner Event',
        description: description.trim() || null,
        city: 'New York',
        preferred_dates: validDates,
        headcount: parseInt(headcount) || 20,
        total_budget: parseFloat(budget) || 0,
        venue_budget_ceiling: parseFloat(budget) || 0,
        date_flexibility_days: 0,
        budget_flexibility_percent: 0,
        constraints: {
          neighborhoods: selectedNeighborhoods.length > 0 ? selectedNeighborhoods : undefined,
          time_frame: (timeFrame || 'evening') as 'morning' | 'afternoon' | 'evening' | 'night',
          // Restaurant-specific
          cuisines: selectedCuisines.length > 0 ? selectedCuisines : undefined,
          requires_private_dining: requiresPrivateDining,
          dietary_restrictions: dietaryRestrictions.trim() || undefined,
        },
        location_address: null,
        location_lat: null,
        location_lng: null,
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save event'
      setError(message)
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
          <h1 className="text-2xl font-bold">Plan Your Dinner</h1>
          <p className="text-muted-foreground">
            Tell us about your event and we&apos;ll find the perfect NYC restaurants
          </p>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-8">
        {/* About Your Event */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Event Details</h3>

          <div className="space-y-2">
            <Label htmlFor="name">Event Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Team Dinner, Birthday Celebration, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Any special occasion or vibe you're going for..."
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
              <Label>Time</Label>
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
                placeholder="20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget">Budget ($)</Label>
              <Input
                id="budget"
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="5000"
              />
              {headcount && budget && parseInt(headcount) > 0 && (
                <p className="text-xs text-muted-foreground">
                  ~${Math.round(parseFloat(budget) / parseInt(headcount))} per person
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Neighborhoods */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Neighborhoods</h3>
          <NeighborhoodPicker
            selected={selectedNeighborhoods}
            onChange={setSelectedNeighborhoods}
            height="350px"
          />
        </div>

        {/* Restaurant Preferences */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Restaurant Preferences</h3>

          {/* Private Dining */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="private-dining"
              checked={requiresPrivateDining}
              onCheckedChange={(checked) => setRequiresPrivateDining(checked === true)}
            />
            <Label htmlFor="private-dining" className="cursor-pointer">
              Requires private dining room
            </Label>
          </div>

          {/* Cuisine Types */}
          <div className="space-y-2">
            <Label>Cuisine Preferences (optional)</Label>
            <div className="flex flex-wrap gap-2">
              {CUISINE_TYPES.map((cuisine) => (
                <PillButton
                  key={cuisine}
                  selected={selectedCuisines.includes(cuisine)}
                  onClick={() => toggleCuisine(cuisine)}
                >
                  {cuisine}
                </PillButton>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Leave empty to search all cuisines
            </p>
          </div>

          {/* Dietary Restrictions */}
          <div className="space-y-2">
            <Label htmlFor="dietary">Dietary Restrictions (optional)</Label>
            <Input
              id="dietary"
              value={dietaryRestrictions}
              onChange={(e) => setDietaryRestrictions(e.target.value)}
              placeholder="Vegetarian options, nut allergies, kosher, etc."
            />
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
            ? isEditMode ? 'Saving...' : 'Finding Restaurants...'
            : isEditMode ? 'Save Changes' : 'Find Restaurants'}
        </Button>
      </form>
    </div>
  )
}
