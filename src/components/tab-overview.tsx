'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Users, DollarSign, MapPin, Clock, ChefHat, Flower2, Clapperboard, CheckCircle2, Circle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { TAB_CATEGORIES, belongsToTab } from '@/types/entities'
import type { Event } from '@/app/actions/events'
import type { EntityWithEventStatus } from '@/app/actions/entities'

interface TabOverviewProps {
  event: Event
  entities: EntityWithEventStatus[]
}

export function TabOverview({ event, entities }: TabOverviewProps) {
  const constraints = (event.constraints || {}) as Record<string, unknown>

  // Count entities per category
  const chefVendors = entities.filter(e => belongsToTab(e, 'chef'))
  const decorVendors = entities.filter(e => belongsToTab(e, 'decor'))
  const prodVendors = entities.filter(e => belongsToTab(e, 'production'))
  const guests = entities.filter(e => belongsToTab(e, 'guests'))

  // Count booked per category
  const bookedCount = (items: EntityWithEventStatus[]) =>
    items.filter(e => e.event_entity?.status === 'booked' || e.event_entity?.status === 'confirmed').length

  const timeline = (constraints.timeline as { time: string; activity: string }[] | undefined) || [
    { time: '7:00 PM', activity: 'Guests arrive, mingling' },
    { time: '7:30 PM', activity: 'Starter served at table' },
    { time: '8:00 PM', activity: 'Main course buffet' },
    { time: '8:45 PM', activity: 'Dessert buffet' },
    { time: '9:15 PM', activity: 'Mingling and wrap-up' },
  ]

  const categories = [
    {
      label: 'Catering',
      icon: ChefHat,
      total: chefVendors.length,
      booked: bookedCount(chefVendors),
      tab: 'chef',
    },
    {
      label: 'Decor',
      icon: Flower2,
      total: decorVendors.length,
      booked: bookedCount(decorVendors),
      tab: 'decor',
    },
    {
      label: 'Production',
      icon: Clapperboard,
      total: prodVendors.length,
      booked: bookedCount(prodVendors),
      tab: 'production',
    },
    {
      label: 'Guests',
      icon: Users,
      total: guests.length,
      booked: guests.filter(e => {
        const rsvp = e.metadata?.rsvp_status as string | undefined
        return rsvp === 'confirmed'
      }).length,
      tab: 'guests',
    },
  ]

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Event Details */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Calendar className="w-4 h-4" />
              Date
            </div>
            <div className="font-semibold">
              {event.date
                ? new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : 'TBD'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Users className="w-4 h-4" />
              Headcount
            </div>
            <div className="font-semibold">{event.headcount || 'TBD'} guests</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="w-4 h-4" />
              Budget
            </div>
            <div className="font-semibold">
              {event.total_budget ? formatCurrency(event.total_budget) : 'TBD'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <MapPin className="w-4 h-4" />
              Venue
            </div>
            <div className="font-semibold truncate">
              {(constraints.venue_name as string) || event.city || 'TBD'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vendor Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {categories.map(cat => {
              const Icon = cat.icon
              const isComplete = cat.total > 0 && cat.booked === cat.total
              const hasProgress = cat.booked > 0

              return (
                <div key={cat.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isComplete ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <Circle className={`w-5 h-5 ${hasProgress ? 'text-amber-500' : 'text-muted-foreground/30'}`} />
                    )}
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{cat.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {cat.total > 0 ? (
                      <Badge variant={isComplete ? 'default' : 'secondary'}>
                        {cat.booked}/{cat.total} {cat.label === 'Guests' ? 'confirmed' : 'booked'}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        None yet
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Event Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {timeline.map((item, idx) => (
              <div key={idx} className="flex items-start gap-4">
                <div className="text-sm font-mono text-muted-foreground w-16 flex-shrink-0 pt-0.5">
                  {item.time}
                </div>
                <div className="flex items-start gap-2 flex-1">
                  <div className="w-2 h-2 rounded-full bg-foreground/20 mt-1.5 flex-shrink-0" />
                  <span className="text-sm">{item.activity}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
