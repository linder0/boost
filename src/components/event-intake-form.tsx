'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Slider } from './ui/slider'
import { Checkbox } from './ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { createEvent } from '@/app/actions/events'

const eventSchema = z.object({
  name: z.string().min(1, 'Event name is required'),
  city: z.string().min(1, 'City is required'),
  preferred_dates: z.array(z.object({
    date: z.string(),
    rank: z.number(),
  })).min(1, 'At least one date is required'),
  headcount: z.number().min(1, 'Headcount must be at least 1'),
  total_budget: z.number().min(0, 'Total budget must be positive'),
  venue_budget_ceiling: z.number().min(0, 'Venue budget must be positive'),
  date_flexibility_days: z.number().min(0).max(30),
  budget_flexibility_percent: z.number().min(0).max(50),
  constraints: z.object({
    ada: z.boolean().optional(),
    alcohol: z.boolean().optional(),
    noise: z.boolean().optional(),
    indoor_outdoor: z.enum(['indoor', 'outdoor', 'either']).optional(),
  }),
})

type EventFormData = z.infer<typeof eventSchema>

export function EventIntakeForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dates, setDates] = useState<{ date: string; rank: number }[]>([
    { date: '', rank: 1 },
  ])
  const [dateFlexibility, setDateFlexibility] = useState([0])
  const [budgetFlexibility, setBudgetFlexibility] = useState([0])
  const [constraints, setConstraints] = useState({
    ada: false,
    alcohol: false,
    noise: false,
    indoor_outdoor: 'either' as 'indoor' | 'outdoor' | 'either',
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
  })

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

  const onSubmit = async (formData: Partial<EventFormData>) => {
    setLoading(true)
    setError(null)

    try {
      const validDates = dates.filter((d) => d.date).map((d, idx) => ({ ...d, rank: idx + 1 }))
      
      if (validDates.length === 0) {
        setError('Please add at least one preferred date')
        setLoading(false)
        return
      }

      const event = await createEvent({
        name: formData.name!,
        city: formData.city!,
        preferred_dates: validDates,
        headcount: formData.headcount!,
        total_budget: formData.total_budget!,
        venue_budget_ceiling: formData.venue_budget_ceiling!,
        date_flexibility_days: dateFlexibility[0],
        budget_flexibility_percent: budgetFlexibility[0],
        constraints,
      })

      router.push(`/events/${event.id}/vendors`)
    } catch (err: any) {
      setError(err.message || 'Failed to create event')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Create New Event</CardTitle>
        <CardDescription>
          Define your event constraints to help automate vendor outreach
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="name">Event Name</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Summer Party 2026"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                {...register('city')}
                placeholder="San Francisco"
              />
              {errors.city && (
                <p className="text-sm text-destructive">{errors.city.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="headcount">Expected Headcount</Label>
              <Input
                id="headcount"
                type="number"
                {...register('headcount', { valueAsNumber: true })}
                placeholder="50"
              />
              {errors.headcount && (
                <p className="text-sm text-destructive">{errors.headcount.message}</p>
              )}
            </div>
          </div>

          {/* Preferred Dates */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Preferred Dates</h3>
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

          {/* Budget */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Budget</h3>
            
            <div className="space-y-2">
              <Label htmlFor="total_budget">Total Budget ($)</Label>
              <Input
                id="total_budget"
                type="number"
                step="0.01"
                {...register('total_budget', { valueAsNumber: true })}
                placeholder="10000"
              />
              {errors.total_budget && (
                <p className="text-sm text-destructive">{errors.total_budget.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="venue_budget_ceiling">Venue Budget Ceiling ($)</Label>
              <Input
                id="venue_budget_ceiling"
                type="number"
                step="0.01"
                {...register('venue_budget_ceiling', { valueAsNumber: true })}
                placeholder="5000"
              />
              {errors.venue_budget_ceiling && (
                <p className="text-sm text-destructive">{errors.venue_budget_ceiling.message}</p>
              )}
            </div>
          </div>

          {/* Flexibility */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Flexibility</h3>
            
            <div className="space-y-2">
              <Label>Date Flexibility: ±{dateFlexibility[0]} days</Label>
              <Slider
                value={dateFlexibility}
                onValueChange={setDateFlexibility}
                max={30}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Budget Flexibility: {budgetFlexibility[0]}%</Label>
              <Slider
                value={budgetFlexibility}
                onValueChange={setBudgetFlexibility}
                max={50}
                step={5}
              />
            </div>
          </div>

          {/* Constraints */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Hard Constraints</h3>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="ada"
                checked={constraints.ada}
                onCheckedChange={(checked) =>
                  setConstraints({ ...constraints, ada: checked as boolean })
                }
              />
              <Label htmlFor="ada">ADA Accessible Required</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="alcohol"
                checked={constraints.alcohol}
                onCheckedChange={(checked) =>
                  setConstraints({ ...constraints, alcohol: checked as boolean })
                }
              />
              <Label htmlFor="alcohol">Alcohol License Required</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="noise"
                checked={constraints.noise}
                onCheckedChange={(checked) =>
                  setConstraints({ ...constraints, noise: checked as boolean })
                }
              />
              <Label htmlFor="noise">No Noise Restrictions</Label>
            </div>

            <div className="space-y-2">
              <Label>Indoor/Outdoor Preference</Label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                value={constraints.indoor_outdoor}
                onChange={(e) =>
                  setConstraints({
                    ...constraints,
                    indoor_outdoor: e.target.value as 'indoor' | 'outdoor' | 'either',
                  })
                }
              >
                <option value="either">Either</option>
                <option value="indoor">Indoor Only</option>
                <option value="outdoor">Outdoor Only</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating Event...' : 'Create Event'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
