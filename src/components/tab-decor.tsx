'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Upload, Flower2, Save } from 'lucide-react'
import { CSVImportModal } from '@/components/csv-import-modal'
import { VendorTable } from '@/components/vendor-table'
import { EmptyState } from '@/components/empty-state'
import { belongsToTab, ENTITY_TAGS } from '@/types/entities'
import { updateEvent, type Event } from '@/app/actions/events'
import type { EntityWithEventStatus } from '@/app/actions/entities'

interface TabDecorProps {
  event: Event
  entities: EntityWithEventStatus[]
}

const DECOR_CHECKLIST = [
  { key: 'flowers', label: 'Flowers / centerpieces' },
  { key: 'tablecloths', label: 'Tablecloths (paper or real)' },
  { key: 'printed_cards', label: 'Custom printed cards' },
  { key: 'candles', label: 'Candles / lighting' },
  { key: 'napkins', label: 'Napkins' },
  { key: 'place_settings', label: 'Place settings / name cards' },
]

export function TabDecor({ event, entities }: TabDecorProps) {
  const router = useRouter()
  const [importOpen, setImportOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const decorVendors = entities.filter(e => belongsToTab(e, 'decor'))
  const constraints = (event.constraints || {}) as Record<string, unknown>
  const decorChecklist = (constraints.decor_checklist as Record<string, boolean>) || {}
  const decorNotes = (constraints.decor_notes as string) || ''

  const [checklist, setChecklist] = useState<Record<string, boolean>>(decorChecklist)
  const [notes, setNotes] = useState(decorNotes)

  const handleToggle = (key: string) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateEvent(event.id, {
        constraints: {
          ...constraints,
          decor_checklist: checklist,
          decor_notes: notes,
        },
      })
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Flower2 className="w-5 h-5" />
            Decor & Design
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Flowers, tablecloths, printed cards, and visual design
          </p>
        </div>
        <Button onClick={() => setImportOpen(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Import from Paradigm
        </Button>
      </div>

      {/* Vendor table */}
      {decorVendors.length > 0 ? (
        <VendorTable
          vendors={decorVendors}
          eventId={event.id}
          columns={['email', 'location', 'website', 'description']}
        />
      ) : (
        <EmptyState
          variant="dashed"
          title="No decor vendors yet"
          description="Import florists, printers, and decor vendors from Paradigm AI"
          action={{
            label: 'Import Vendors',
            onClick: () => setImportOpen(true),
          }}
        />
      )}

      {/* Decor Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Decor Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {DECOR_CHECKLIST.map(item => (
            <label key={item.key} className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={!!checklist[item.key]}
                onCheckedChange={() => handleToggle(item.key)}
              />
              <span className={`text-sm ${checklist[item.key] ? 'line-through text-muted-foreground' : ''}`}>
                {item.label}
              </span>
            </label>
          ))}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Design Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Theme, color palette, mood board links, inspiration..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
          />
          <Button variant="outline" onClick={handleSave} disabled={saving} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </CardContent>
      </Card>

      <CSVImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        eventId={event.id}
        category="decor"
        categoryLabel="Decor Vendors"
        defaultTags={[ENTITY_TAGS.DECOR]}
      />
    </div>
  )
}
