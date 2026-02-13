'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Calendar, Users, DollarSign, MapPin, Pencil, Check } from 'lucide-react'
import { updateEvent, type Event } from '@/app/actions/events'
import { formatCurrency } from '@/lib/utils'

interface EventHeaderProps {
  event: Event
}

export function EventHeader({ event }: EventHeaderProps) {
  const router = useRouter()
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState(event.name)

  const handleSaveName = async () => {
    if (name.trim() && name !== event.name) {
      await updateEvent(event.id, { name: name.trim() })
      router.refresh()
    }
    setEditingName(false)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Date TBD'
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const venueName = (event.constraints as Record<string, unknown>)?.venue_name as string | undefined

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="px-6 py-4">
        {/* Back button + title row */}
        <div className="flex items-center gap-3 mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/')}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          {editingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName()
                  if (e.key === 'Escape') { setName(event.name); setEditingName(false) }
                }}
                className="text-2xl font-bold h-10 w-80"
                autoFocus
              />
              <Button size="sm" variant="ghost" onClick={handleSaveName}>
                <Check className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h1 className="text-2xl font-bold tracking-tight">{event.name}</h1>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setEditingName(true)}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-4 ml-11 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(event.date)}
          </span>
          {event.headcount && (
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {event.headcount} guests
            </span>
          )}
          {event.total_budget && (
            <span className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              {formatCurrency(event.total_budget)} budget
            </span>
          )}
          {(venueName || event.city) && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {venueName ? `${venueName}, ${event.city || ''}` : event.city}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
