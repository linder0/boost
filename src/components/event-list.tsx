'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Calendar, Users, DollarSign, ChevronRight } from 'lucide-react'
import { createEvent, type Event } from '@/app/actions/events'
import { formatCurrency } from '@/lib/utils'

interface EventListProps {
  events: Event[]
}

export function EventList({ events }: EventListProps) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)

  const handleCreateEvent = async () => {
    setCreating(true)
    try {
      const event = await createEvent({
        name: 'New Dinner',
        city: 'Berlin',
        headcount: 30,
        total_budget: 4000,
        description: 'Dinner series event',
      })
      router.push(`/events/${event.id}`)
    } catch (error) {
      console.error('Failed to create event:', error)
    } finally {
      setCreating(false)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Date TBD'
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dinner Series</h1>
          <p className="text-muted-foreground mt-1">Plan and produce your events</p>
        </div>
        <Button onClick={handleCreateEvent} disabled={creating}>
          <Plus className="w-4 h-4 mr-2" />
          {creating ? 'Creating...' : 'New Event'}
        </Button>
      </div>

      {events.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No events yet</h3>
            <p className="text-muted-foreground mt-1 mb-4">
              Create your first dinner event to get started
            </p>
            <Button onClick={handleCreateEvent} disabled={creating}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Event
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <Card
              key={event.id}
              className="cursor-pointer transition-colors hover:bg-muted/50 py-0"
              onClick={() => router.push(`/events/${event.id}`)}
            >
              <CardContent className="flex items-center justify-between py-5 px-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg truncate">{event.name}</h3>
                    <Badge variant="secondary">{formatDate(event.date)}</Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground">
                    {event.headcount && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {event.headcount} guests
                      </span>
                    )}
                    {event.total_budget && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        {formatCurrency(event.total_budget)}
                      </span>
                    )}
                    {event.city && (
                      <span>{event.city}</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
