'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Upload, Clapperboard, Save } from 'lucide-react'
import { CSVImportModal } from '@/components/csv-import-modal'
import { VendorTable } from '@/components/vendor-table'
import { EmptyState } from '@/components/empty-state'
import { belongsToTab, ENTITY_TAGS } from '@/types/entities'
import { updateEvent, type Event } from '@/app/actions/events'
import type { EntityWithEventStatus } from '@/app/actions/entities'

interface TabProductionProps {
  event: Event
  entities: EntityWithEventStatus[]
}

const AV_CHECKLIST = [
  { key: 'speaker', label: 'Speaker system (Bose S1 Pro)' },
  { key: 'mic', label: 'Microphone for Q&A' },
  { key: 'projector', label: 'Projector / screen' },
  { key: 'lighting', label: 'Event lighting' },
  { key: 'music', label: 'Background music playlist' },
]

const STAFF_ROLES = [
  { key: 'coordinator', label: 'Event coordinator' },
  { key: 'server1', label: 'Server / staff #1' },
  { key: 'server2', label: 'Server / staff #2' },
  { key: 'videographer', label: 'Videographer' },
  { key: 'photographer', label: 'Photographer' },
]

export function TabProduction({ event, entities }: TabProductionProps) {
  const router = useRouter()
  const [importOpen, setImportOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const prodVendors = entities.filter(e => belongsToTab(e, 'production'))
  const constraints = (event.constraints || {}) as Record<string, unknown>
  const avChecklist = (constraints.av_checklist as Record<string, boolean>) || {}
  const floorPlan = (constraints.floor_plan as string) || ''
  const shotList = (constraints.shot_list as string) || ''

  const [avState, setAvState] = useState<Record<string, boolean>>(avChecklist)
  const [floorPlanState, setFloorPlanState] = useState(floorPlan)
  const [shotListState, setShotListState] = useState(shotList)

  const handleToggleAv = (key: string) => {
    setAvState(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateEvent(event.id, {
        constraints: {
          ...constraints,
          av_checklist: avState,
          floor_plan: floorPlanState,
          shot_list: shotListState,
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
            <Clapperboard className="w-5 h-5" />
            Production & Ops
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Staff, AV, video production, and logistics
          </p>
        </div>
        <Button onClick={() => setImportOpen(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Import from Paradigm
        </Button>
      </div>

      {/* Vendor table */}
      {prodVendors.length > 0 ? (
        <VendorTable
          vendors={prodVendors}
          eventId={event.id}
          columns={['email', 'description', 'tags']}
        />
      ) : (
        <EmptyState
          variant="dashed"
          title="No production staff yet"
          description="Import staff, videographers, and AV vendors from Paradigm AI"
          action={{
            label: 'Import Staff',
            onClick: () => setImportOpen(true),
          }}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* AV Checklist */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">AV Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {AV_CHECKLIST.map(item => (
              <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={!!avState[item.key]}
                  onCheckedChange={() => handleToggleAv(item.key)}
                />
                <span className={`text-sm ${avState[item.key] ? 'line-through text-muted-foreground' : ''}`}>
                  {item.label}
                </span>
              </label>
            ))}
          </CardContent>
        </Card>

        {/* Staff Roles */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Staff Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {STAFF_ROLES.map(role => {
                const assigned = prodVendors.find(v => v.tags.includes(role.key))
                return (
                  <div key={role.key} className="flex items-center justify-between text-sm">
                    <span>{role.label}</span>
                    <span className={assigned ? 'font-medium' : 'text-muted-foreground'}>
                      {assigned ? assigned.name : 'Unassigned'}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Video & Floor Plan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shot List / Video Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Key moments to capture, interview setup, deliverables..."
              value={shotListState}
              onChange={(e) => setShotListState(e.target.value)}
              rows={5}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Floor Plan / Layout</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Where starter table goes, buffet placement, dessert station, mingling area..."
              value={floorPlanState}
              onChange={(e) => setFloorPlanState(e.target.value)}
              rows={5}
            />
          </CardContent>
        </Card>
      </div>

      <Button variant="outline" onClick={handleSave} disabled={saving} className="w-full">
        <Save className="w-4 h-4 mr-2" />
        {saving ? 'Saving...' : 'Save Production Notes'}
      </Button>

      <CSVImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        eventId={event.id}
        category="production"
        categoryLabel="Production Staff"
        defaultTags={[ENTITY_TAGS.STAFF]}
      />
    </div>
  )
}
