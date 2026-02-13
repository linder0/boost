'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Upload, Users, Trash2 } from 'lucide-react'
import { CSVImportModal } from '@/components/csv-import-modal'
import { EmptyState } from '@/components/empty-state'
import { belongsToTab, ENTITY_TAGS, type GuestRsvpStatus } from '@/types/entities'
import { updateEntity, unlinkEntityFromEvent, type EntityWithEventStatus } from '@/app/actions/entities'
import type { Event } from '@/app/actions/events'

interface TabGuestsProps {
  event: Event
  entities: EntityWithEventStatus[]
}

const RSVP_OPTIONS: { value: GuestRsvpStatus; label: string; color: string }[] = [
  { value: 'invited', label: 'Invited', color: 'bg-blue-100 text-blue-700' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-green-100 text-green-700' },
  { value: 'maybe', label: 'Maybe', color: 'bg-amber-100 text-amber-700' },
  { value: 'declined', label: 'Declined', color: 'bg-red-100 text-red-700' },
]

export function TabGuests({ event, entities }: TabGuestsProps) {
  const router = useRouter()
  const [importOpen, setImportOpen] = useState(false)

  const guests = entities.filter(e => belongsToTab(e, 'guests'))

  // RSVP counts
  const confirmed = guests.filter(g => (g.metadata?.rsvp_status as string) === 'confirmed').length
  const maybe = guests.filter(g => (g.metadata?.rsvp_status as string) === 'maybe').length
  const declined = guests.filter(g => (g.metadata?.rsvp_status as string) === 'declined').length
  const invited = guests.length - confirmed - maybe - declined

  const handleRsvpChange = async (guestId: string, status: GuestRsvpStatus) => {
    const guest = guests.find(g => g.id === guestId)
    if (!guest) return

    await updateEntity(guestId, {
      metadata: {
        ...guest.metadata,
        rsvp_status: status,
      },
    })
    router.refresh()
  }

  const handleRemove = async (guestId: string) => {
    await unlinkEntityFromEvent(event.id, guestId)
    router.refresh()
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Guest List
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage attendees, RSVPs, and dietary requirements
          </p>
        </div>
        <Button onClick={() => setImportOpen(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Import Guests
        </Button>
      </div>

      {/* RSVP Summary */}
      {guests.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-3 pb-3 text-center">
              <div className="text-2xl font-bold">{confirmed}</div>
              <div className="text-xs text-muted-foreground">Confirmed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-3 text-center">
              <div className="text-2xl font-bold">{maybe}</div>
              <div className="text-xs text-muted-foreground">Maybe</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-3 text-center">
              <div className="text-2xl font-bold">{invited}</div>
              <div className="text-xs text-muted-foreground">Invited</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-3 text-center">
              <div className="text-2xl font-bold">{declined}</div>
              <div className="text-xs text-muted-foreground">Declined</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Guest table */}
      {guests.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Dietary</TableHead>
                <TableHead>RSVP</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guests.map((guest) => {
                const rsvp = (guest.metadata?.rsvp_status as GuestRsvpStatus) || 'invited'
                const company = guest.metadata?.company as string | undefined
                const title = guest.metadata?.title as string | undefined
                const dietary = guest.metadata?.dietary as string | undefined

                return (
                  <TableRow key={guest.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{guest.name}</div>
                        {title && <div className="text-xs text-muted-foreground">{title}</div>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{company || '-'}</TableCell>
                    <TableCell className="text-sm">
                      {guest.metadata?.email ? (
                        <a href={`mailto:${guest.metadata.email}`} className="hover:underline">
                          {guest.metadata.email as string}
                        </a>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {dietary ? (
                        <Badge variant="outline" className="text-xs">{dietary}</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={rsvp}
                        onValueChange={(value) => handleRsvpChange(guest.id, value as GuestRsvpStatus)}
                      >
                        <SelectTrigger className="h-7 w-[120px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RSVP_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemove(guest.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          variant="dashed"
          title="No guests yet"
          description="Import your guest list from a spreadsheet"
          action={{
            label: 'Import Guests',
            onClick: () => setImportOpen(true),
          }}
        />
      )}

      <CSVImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        eventId={event.id}
        category="guests"
        categoryLabel="Guests"
        defaultTags={[ENTITY_TAGS.GUEST]}
      />
    </div>
  )
}
