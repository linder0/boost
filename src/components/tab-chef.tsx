'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Upload, ChefHat, Save } from 'lucide-react'
import { CSVImportModal } from '@/components/csv-import-modal'
import { VendorTable } from '@/components/vendor-table'
import { EmptyState } from '@/components/empty-state'
import { belongsToTab, ENTITY_TAGS } from '@/types/entities'
import { updateEvent, type Event } from '@/app/actions/events'
import type { EntityWithEventStatus } from '@/app/actions/entities'

interface TabChefProps {
  event: Event
  entities: EntityWithEventStatus[]
}

export function TabChef({ event, entities }: TabChefProps) {
  const router = useRouter()
  const [importOpen, setImportOpen] = useState(false)
  const [menuSaving, setMenuSaving] = useState(false)

  const caterers = entities.filter(e => belongsToTab(e, 'chef'))
  const constraints = (event.constraints || {}) as Record<string, unknown>

  const [starter, setStarter] = useState((constraints.menu_starter as string) || '')
  const [main, setMain] = useState((constraints.menu_main as string) || '')
  const [dessert, setDessert] = useState((constraints.menu_dessert as string) || '')

  const handleSaveMenu = async () => {
    setMenuSaving(true)
    try {
      await updateEvent(event.id, {
        constraints: {
          ...constraints,
          menu_starter: starter,
          menu_main: main,
          menu_dessert: dessert,
        },
      })
      router.refresh()
    } finally {
      setMenuSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ChefHat className="w-5 h-5" />
            Catering
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage caterers and plan the menu
          </p>
        </div>
        <Button onClick={() => setImportOpen(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Import from Paradigm
        </Button>
      </div>

      {/* Caterer table */}
      {caterers.length > 0 ? (
        <VendorTable
          vendors={caterers}
          eventId={event.id}
          columns={['email', 'location', 'website']}
        />
      ) : (
        <EmptyState
          variant="dashed"
          title="No caterers yet"
          description="Import caterers from a Paradigm AI spreadsheet export"
          action={{
            label: 'Import Caterers',
            onClick: () => setImportOpen(true),
          }}
        />
      )}

      {/* Menu Planning */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Menu Planning</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Starter (served at table)</label>
            <Textarea
              placeholder="e.g., Burrata with heirloom tomatoes and basil..."
              value={starter}
              onChange={(e) => setStarter(e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Main Course (buffet-style)</label>
            <Textarea
              placeholder="e.g., Herb-crusted lamb, roasted vegetables, grain salad..."
              value={main}
              onChange={(e) => setMain(e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Dessert (buffet station)</label>
            <Textarea
              placeholder="e.g., Tiramisu, fruit tart, chocolate mousse..."
              value={dessert}
              onChange={(e) => setDessert(e.target.value)}
              rows={2}
            />
          </div>
          <Button
            variant="outline"
            onClick={handleSaveMenu}
            disabled={menuSaving}
            className="w-full"
          >
            <Save className="w-4 h-4 mr-2" />
            {menuSaving ? 'Saving...' : 'Save Menu'}
          </Button>
        </CardContent>
      </Card>

      <CSVImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        eventId={event.id}
        category="chef"
        categoryLabel="Caterers"
        defaultTags={[ENTITY_TAGS.CATERER]}
      />
    </div>
  )
}
