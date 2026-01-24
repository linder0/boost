'use client'

import { Event } from '@/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { EmptyState } from './empty-state'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import { deleteEvent } from '@/app/actions/events'

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
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{event.name}</CardTitle>
                    {event.city && <Badge variant="outline">{event.city}</Badge>}
                  </div>
                  <CardDescription>{formattedDate}</CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger 
                    className="p-1 rounded hover:bg-accent cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg
                      className="h-5 w-5 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                      />
                    </svg>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/events/${event.id}/settings`)
                      }}
                      className="cursor-pointer"
                    >
                      <svg
                        className="mr-2 h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={async (e) => {
                        e.stopPropagation()
                        if (confirm('Are you sure you want to delete this event?')) {
                          await deleteEvent(event.id)
                          router.refresh()
                        }
                      }}
                      className="cursor-pointer text-destructive focus:text-destructive"
                    >
                      <svg
                        className="mr-2 h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
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
