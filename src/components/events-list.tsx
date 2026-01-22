'use client'

import { Event } from '@/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { EmptyState } from './empty-state'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'

interface EventsListProps {
  events: Event[]
}

export function EventsList({ events }: EventsListProps) {
  const router = useRouter()

  if (events.length === 0) {
    return (
      <EmptyState
        title="No events yet"
        description="Get started by creating your first event"
        action={{
          label: 'Create New Event',
          onClick: () => router.push('/events/new'),
        }}
      />
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => {
        const primaryDate = event.preferred_dates?.[0]?.date
        const formattedDate = primaryDate 
          ? format(new Date(primaryDate), 'MMM d, yyyy')
          : 'No date set'

        return (
          <Card 
            key={event.id} 
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => router.push(`/events/${event.id}/vendors`)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{event.name}</CardTitle>
                <Badge variant="outline">{event.city}</Badge>
              </div>
              <CardDescription>{formattedDate}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Headcount</span>
                  <span className="font-medium">{event.headcount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Budget</span>
                  <span className="font-medium">{formatCurrency(event.total_budget)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Venue Ceiling</span>
                  <span className="font-medium">{formatCurrency(event.venue_budget_ceiling)}</span>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/events/${event.id}/vendors`)
                  }}
                >
                  Vendors
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/events/${event.id}/log`)
                  }}
                >
                  Log
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
