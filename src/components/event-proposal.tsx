'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from './ui/card'
import { formatCurrency } from '@/lib/utils'
import { Event } from '@/types/database'

// ============================================================================
// Helpers
// ============================================================================

const TIME_FRAME_LABELS: Record<string, string> = {
  morning: 'Morning (8am-12pm)',
  afternoon: 'Afternoon (12pm-5pm)',
  evening: 'Evening (5pm-9pm)',
  night: 'Night (9pm+)',
}

function formatDates(dates: { date: string; rank: number }[]): string {
  if (!dates.length) return 'No date set'
  return dates
    .map((d) => {
      try {
        return format(new Date(d.date + 'T00:00:00'), 'EEEE, MMMM d, yyyy')
      } catch {
        return d.date
      }
    })
    .join(' / ')
}

// ============================================================================
// Markdown generator (exported for agents)
// ============================================================================

export function eventToMarkdown(event: Event): string {
  const { constraints } = event
  const lines: string[] = []

  lines.push(`# ${event.name}`)
  lines.push('')

  if (event.description) {
    lines.push(event.description)
    lines.push('')
  }

  lines.push('## Details')
  lines.push('')

  // Date & Time
  const dateStr = formatDates(event.preferred_dates || [])
  const timeFrame = constraints?.time_frame
    ? TIME_FRAME_LABELS[constraints.time_frame] || constraints.time_frame
    : null
  lines.push(`- **Date:** ${dateStr}`)
  if (timeFrame) lines.push(`- **Time:** ${timeFrame}`)

  // Guests & Budget
  lines.push(`- **Guests:** ${event.headcount}`)
  lines.push(`- **Budget:** ${formatCurrency(event.total_budget)}`)
  if (event.headcount > 0 && event.total_budget > 0) {
    lines.push(`- **Per person:** ~${formatCurrency(Math.round(event.total_budget / event.headcount))}`)
  }

  // Location
  const neighborhoods = constraints?.neighborhoods?.length
    ? constraints.neighborhoods.join(', ')
    : null
  if (neighborhoods) lines.push(`- **Neighborhood:** ${neighborhoods}`)
  if (event.city) lines.push(`- **City:** ${event.city}`)
  if (event.location_address) lines.push(`- **Venue address:** ${event.location_address}`)

  // Food & Beverage
  const cuisines = constraints?.cuisines?.length
    ? constraints.cuisines.join(', ')
    : null
  if (cuisines) lines.push(`- **Cuisines:** ${cuisines}`)
  if (constraints?.requires_private_dining) lines.push(`- **Private dining:** Required`)
  if (constraints?.dietary_restrictions) lines.push(`- **Dietary restrictions:** ${constraints.dietary_restrictions}`)

  lines.push('')
  return lines.join('\n')
}

// ============================================================================
// Component
// ============================================================================

interface EventProposalProps {
  event: Event
}

export function EventProposal({ event }: EventProposalProps) {
  const [showAddress, setShowAddress] = useState(false)
  const [copied, setCopied] = useState(false)

  // Don't render for empty/default events
  const hasData =
    event.name &&
    event.name !== 'Untitled Event' &&
    (event.preferred_dates?.length > 0 || event.headcount > 0 || event.total_budget > 0)

  if (!hasData) return null

  const { constraints } = event
  const neighborhoods = constraints?.neighborhoods?.length
    ? constraints.neighborhoods.join(', ')
    : null
  const cuisines = constraints?.cuisines?.length
    ? constraints.cuisines.join(', ')
    : null
  const timeFrame = constraints?.time_frame
    ? TIME_FRAME_LABELS[constraints.time_frame] || constraints.time_frame
    : null
  const perPerson =
    event.headcount > 0 && event.total_budget > 0
      ? Math.round(event.total_budget / event.headcount)
      : null

  const handleCopy = async () => {
    const md = eventToMarkdown(event)
    await navigator.clipboard.writeText(md)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card id="event-proposal" className="mb-8">
      <CardHeader>
        <CardTitle className="text-xl">Event Proposal</CardTitle>
        {event.description && (
          <CardDescription className="text-sm mt-1">
            {event.description}
          </CardDescription>
        )}
        <CardAction>
          <button
            type="button"
            onClick={handleCopy}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors cursor-pointer"
          >
            {copied ? 'Copied!' : 'Copy as Markdown'}
          </button>
        </CardAction>
      </CardHeader>

      <CardContent className="-mt-2">
        <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
          {/* Date & Time */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
              Date &amp; Time
            </p>
            <p className="text-sm">
              {formatDates(event.preferred_dates || [])}
            </p>
            {timeFrame && (
              <p className="text-sm text-muted-foreground">{timeFrame}</p>
            )}
          </div>

          {/* Guests & Budget */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
              Guests &amp; Budget
            </p>
            <p className="text-sm">
              {event.headcount} guests &middot; {formatCurrency(event.total_budget)}
            </p>
            {perPerson && (
              <p className="text-sm text-muted-foreground">
                ~{formatCurrency(perPerson)} per person
              </p>
            )}
          </div>

          {/* Location / Neighborhood */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
              Location
            </p>
            {neighborhoods ? (
              <p className="text-sm">{neighborhoods}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {event.city || 'No location set'}
              </p>
            )}
            {event.location_address && (
              <>
                {showAddress ? (
                  <p className="text-sm text-muted-foreground mt-1">
                    {event.location_address}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddress(true)}
                    className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors mt-1 cursor-pointer"
                  >
                    Show venue address
                  </button>
                )}
              </>
            )}
          </div>

          {/* Food & Beverage */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
              Food &amp; Beverage
            </p>
            {cuisines ? (
              <p className="text-sm">{cuisines}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No cuisine preference</p>
            )}
            {constraints?.requires_private_dining && (
              <p className="text-sm text-muted-foreground">Private dining required</p>
            )}
            {constraints?.dietary_restrictions && (
              <p className="text-sm text-muted-foreground">
                Dietary: {constraints.dietary_restrictions}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
