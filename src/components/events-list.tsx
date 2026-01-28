'use client'

import { Event } from '@/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
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
import { Plus } from 'lucide-react'
import { MoreDotsIcon, EditIcon, TrashIcon } from './ui/icons'

interface EventsListProps {
  events: Event[]
}

export function EventsList({ events }: EventsListProps) {
  const router = useRouter()

  const handleDeleteEvent = async (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this event?')) {
      await deleteEvent(eventId)
      router.refresh()
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Create New Event Card */}
      <Card 
        className="cursor-pointer border-0 bg-muted/50 hover:bg-muted/70 transition-colors flex items-center justify-center min-h-[220px]"
        onClick={() => router.push('/events/new')}
      >
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="rounded-full bg-muted-foreground/20 p-4">
            <Plus className="h-8 w-8 text-muted-foreground" />
          </div>
          <span className="font-medium">Create New Event</span>
        </div>
      </Card>

      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          onDelete={(e) => handleDeleteEvent(event.id, e)}
          onNavigate={(path) => router.push(path)}
        />
      ))}
    </div>
  )
}

// ============================================================================
// Subcomponents
// ============================================================================

interface EventCardProps {
  event: Event
  onDelete: (e: React.MouseEvent) => void
  onNavigate: (path: string) => void
}

function EventCard({ event, onDelete, onNavigate }: EventCardProps) {
  const primaryDate = event.preferred_dates?.[0]?.date
  const formattedDate = primaryDate 
    ? format(new Date(primaryDate), 'MMM d, yyyy')
    : 'No date set'

  return (
    <Card 
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => onNavigate(`/events/${event.id}/vendors`)}
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
              <MoreDotsIcon className="h-5 w-5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onNavigate(`/events/${event.id}/settings`)
                }}
                className="cursor-pointer"
              >
                <EditIcon className="mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <TrashIcon className="mr-2" />
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
              onNavigate(`/events/${event.id}/vendors`)
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
              onNavigate(`/events/${event.id}/log`)
            }}
          >
            Log
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
