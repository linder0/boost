'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { X, Send, Loader2, ExternalLink } from 'lucide-react'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion'
import { toast } from 'sonner'
import { MessageTimeline } from './message-timeline'
import { ParsedFactsCard } from './parsed-facts-card'
import { EscalationContextPanel } from './escalation-context-panel'
import { LocationPicker, LocationData, MapboxMap } from './mapbox'
import { VendorWithThread, MessageWithParsed } from '@/types/database'
import { escalateThread, updateThreadStatus, approveOutreach } from '@/app/actions/threads'
import { updateVendor, updateVendorLocation, regenerateVendorMessage, updateVendorMessage } from '@/app/actions/vendors'
import { normalizeJoinResult } from '@/lib/utils'
import { VendorNameDisplay } from './vendor-display'

// ============================================================================
// Shared Helpers
// ============================================================================

/**
 * Run an async action with a loading flag and toast on error.
 */
async function withLoading(
  setLoading: (v: boolean) => void,
  action: () => Promise<void>,
  errorMessage: string,
) {
  setLoading(true)
  try {
    await action()
  } catch (error) {
    console.error(errorMessage, error)
    toast.error(errorMessage)
  } finally {
    setLoading(false)
  }
}

// ============================================================================
// Editable Detail Cell
// ============================================================================

type EditableDetailField = 'contact_email' | 'phone' | 'website' | 'cuisine' | 'price_per_person' | 'category'

function EditableDetailValue({
  value,
  field,
  placeholder,
  isLink,
  editingField,
  onStartEdit,
  onSave,
}: {
  value: string
  field: EditableDetailField
  placeholder?: string
  isLink?: boolean
  editingField: EditableDetailField | null
  onStartEdit: (field: EditableDetailField) => void
  onSave: (field: EditableDetailField, newValue: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const isEditing = editingField === field

  const handleBlur = () => {
    const newValue = inputRef.current?.value ?? value
    onSave(field, newValue)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleBlur()
    if (e.key === 'Escape') onSave(field, value) // revert
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        defaultValue={value}
        autoFocus
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full bg-transparent outline-none text-sm py-0.5 border-b border-foreground/20 focus:border-foreground transition-colors"
        placeholder={placeholder}
      />
    )
  }

  const display = value || placeholder

  if (isLink && value) {
    return (
      <div className="flex items-center gap-1.5 group/cell">
        <a
          href={value.startsWith('http') ? value : `https://${value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline truncate"
          onClick={(e) => e.stopPropagation()}
        >
          {value}
        </a>
        <ExternalLink className="w-3 h-3 text-blue-600 shrink-0" />
        <button
          className="text-xs text-muted-foreground opacity-0 group-hover/cell:opacity-100 transition-opacity ml-1"
          onClick={() => onStartEdit(field)}
        >
          Edit
        </button>
      </div>
    )
  }

  return (
    <div
      className="cursor-text min-h-[24px] flex items-center text-sm rounded px-1 -mx-1 hover:bg-muted/60 transition-colors"
      onClick={() => onStartEdit(field)}
    >
      <span className={value ? '' : 'text-muted-foreground/50'}>
        {display}
      </span>
    </div>
  )
}

// ============================================================================
// Vendor Details Grid
// ============================================================================

function VendorDetailsGrid({
  vendor,
  editingField,
  onStartEdit,
  onSave,
}: {
  vendor: VendorWithThread
  editingField: EditableDetailField | null
  onStartEdit: (field: EditableDetailField) => void
  onSave: (field: EditableDetailField, newValue: string) => void
}) {
  const editableRows: { label: string; field: EditableDetailField; value: string; placeholder: string; isLink?: boolean }[] = [
    { label: 'Contact Email', field: 'contact_email', value: vendor.contact_email, placeholder: 'Add email' },
    { label: 'Phone', field: 'phone', value: vendor.phone || '', placeholder: 'Add phone' },
    { label: 'Website', field: 'website', value: vendor.website || '', placeholder: 'Add website', isLink: true },
    { label: 'Cuisine', field: 'cuisine', value: vendor.cuisine || '', placeholder: 'Add cuisine' },
    { label: 'Price / Person', field: 'price_per_person', value: vendor.price_per_person || '', placeholder: 'Add price' },
    { label: 'Category', field: 'category', value: vendor.category, placeholder: 'Add category' },
  ]

  const displayRows: { label: string; value: string }[] = []

  if (vendor.has_private_dining != null) {
    let pdValue = vendor.has_private_dining ? 'Yes' : 'No'
    if (vendor.has_private_dining && vendor.private_dining_capacity_min && vendor.private_dining_capacity_max) {
      pdValue += ` (${vendor.private_dining_capacity_min}-${vendor.private_dining_capacity_max} guests)`
    }
    displayRows.push({ label: 'Private Dining', value: pdValue })
  }
  if (vendor.private_dining_minimum) {
    displayRows.push({ label: 'PDR Minimum', value: `$${vendor.private_dining_minimum.toLocaleString()}` })
  }
  if (vendor.rating) {
    displayRows.push({ label: 'Rating', value: `${vendor.rating}/5` })
  }
  if (vendor.beli_rank) {
    displayRows.push({ label: 'Beli Rank', value: `#${vendor.beli_rank}` })
  }
  if (vendor.address) {
    displayRows.push({ label: 'Address', value: vendor.address })
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Vendor Details</h3>
      <div className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-2">
        {editableRows.map((row) => (
          <div key={row.field} className="contents">
            <span className="text-sm text-muted-foreground py-0.5">{row.label}</span>
            <EditableDetailValue
              value={row.value}
              field={row.field}
              placeholder={row.placeholder}
              isLink={row.isLink}
              editingField={editingField}
              onStartEdit={onStartEdit}
              onSave={onSave}
            />
          </div>
        ))}
        {displayRows.map((row) => (
          <div key={row.label} className="contents">
            <span className="text-sm text-muted-foreground py-0.5">{row.label}</span>
            <span className="text-sm py-0.5">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Outreach Message Section (extracted component)
// ============================================================================

function OutreachMessageSection({
  vendor,
  canApprove,
  onApprove,
  approving,
}: {
  vendor: VendorWithThread
  canApprove: boolean
  onApprove: () => void
  approving: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [localMessage, setLocalMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [suggestionText, setSuggestionText] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const displayMessage = localMessage || vendor.custom_message
  const hasMessage = !!displayMessage

  const handleRegenerate = async (withSuggestions?: boolean) => {
    await withLoading(setRegenerating, async () => {
      const hints = withSuggestions && suggestionText.trim() ? suggestionText.trim() : undefined
      const newMessage = await regenerateVendorMessage(vendor.id, hints)
      setLocalMessage(newMessage)
      setEditing(false)
      setSuggestionText('')
      setShowSuggestions(false)
    }, 'Failed to generate message')
  }

  const handleSaveMessage = async () => {
    await withLoading(setSaving, async () => {
      await updateVendorMessage(vendor.id, localMessage)
      setEditing(false)
    }, 'Failed to save message')
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Outreach Message</h3>
        {!editing && hasMessage && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setLocalMessage(displayMessage || '')
              setEditing(true)
            }}
          >
            Edit
          </Button>
        )}
      </div>

      {/* Message content */}
      {editing ? (
        <div className="space-y-3">
          <Textarea
            value={localMessage}
            onChange={(e) => setLocalMessage(e.target.value)}
            rows={10}
            placeholder="Enter your outreach message..."
            className="font-mono text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveMessage} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : hasMessage ? (
        <div className="rounded-md bg-muted p-4">
          <pre className="whitespace-pre-wrap text-sm font-mono">{displayMessage}</pre>
        </div>
      ) : (
        <div className="rounded-md border border-dashed p-4 text-center">
          <p className="text-sm text-muted-foreground">No outreach message generated yet</p>
        </div>
      )}

      {/* Suggest edits / Regenerate controls */}
      {!editing && (
        <div className="space-y-2">
          {showSuggestions ? (
            <div className="space-y-2">
              <Textarea
                value={suggestionText}
                onChange={(e) => setSuggestionText(e.target.value)}
                rows={2}
                placeholder='e.g. "mention we can be flexible on dates" or "make it shorter and more casual"'
                className="text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleRegenerate(true)}
                  disabled={regenerating || !suggestionText.trim()}
                >
                  {regenerating ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Regenerating...</>
                  ) : (
                    'Regenerate with suggestions'
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowSuggestions(false); setSuggestionText('') }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowSuggestions(true)}>
                Suggest edits
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handleRegenerate(false)}
                disabled={regenerating}
              >
                {regenerating ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Generating...</>
                ) : (
                  hasMessage ? 'Regenerate' : 'Generate'
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Approve & Send */}
      {canApprove && hasMessage && !editing && (
        <Button onClick={onApprove} disabled={approving} className="w-full">
          {approving ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
          ) : (
            <><Send className="w-4 h-4 mr-2" /> Approve & Send</>
          )}
        </Button>
      )}
    </div>
  )
}

// ============================================================================
// Location Section (extracted component)
// ============================================================================

function LocationSection({
  vendor,
  currentLocation,
}: {
  vendor: VendorWithThread
  currentLocation: LocationData | null
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [location, setLocation] = useState<LocationData | null>(null)

  const handleSaveLocation = async () => {
    await withLoading(setSaving, async () => {
      await updateVendorLocation(
        vendor.id,
        location
          ? { address: location.address, latitude: location.lat, longitude: location.lng }
          : null
      )
      setEditing(false)
    }, 'Failed to save location')
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Location</h3>
        {!editing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setLocation(currentLocation)
              setEditing(true)
            }}
          >
            {currentLocation ? 'Edit' : 'Add Location'}
          </Button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <LocationPicker
            value={location}
            onChange={setLocation}
            label=""
            placeholder="Search for venue address..."
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveLocation} disabled={saving}>
              {saving ? 'Saving...' : 'Save Location'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : currentLocation ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{currentLocation.address}</p>
          <MapboxMap
            center={{ lat: currentLocation.lat, lng: currentLocation.lng }}
            zoom={14}
            markers={[{ id: vendor.id, lat: currentLocation.lat, lng: currentLocation.lng, label: vendor.name }]}
            interactive={false}
            height="200px"
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No location set</p>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

interface VendorDrawerProps {
  vendor: VendorWithThread | null
  messages: MessageWithParsed[]
  onClose: () => void
}

export function VendorDrawer({ vendor, messages, onClose }: VendorDrawerProps) {
  const [escalationLoading, setEscalationLoading] = useState(false)
  const [approving, setApproving] = useState(false)

  // Detail editing
  const [editingField, setEditingField] = useState<EditableDetailField | null>(null)

  const handleStartEdit = useCallback((field: EditableDetailField) => {
    setEditingField(field)
  }, [])

  const handleSaveField = useCallback(async (field: EditableDetailField, newValue: string) => {
    setEditingField(null)
    if (!vendor) return

    const originalValue = String(vendor[field] ?? '')
    if (newValue === originalValue) return

    try {
      await updateVendor(vendor.id, { [field]: newValue || null })
    } catch (error) {
      console.error('Failed to update vendor field:', error)
      toast.error(`Failed to update ${field.replace(/_/g, ' ')}`)
    }
  }, [vendor])

  if (!vendor) return null

  const thread = normalizeJoinResult(vendor.vendor_threads)

  const currentLocation: LocationData | null =
    vendor.latitude && vendor.longitude
      ? { address: vendor.address || '', lat: vendor.latitude, lng: vendor.longitude }
      : null

  const isEscalation = thread?.status === 'ESCALATION'
  const isNotContacted = !thread || thread.status === 'NOT_CONTACTED'
  const canApprove = isNotContacted && (!thread || !thread.outreach_approved)

  const handleApproveOutreach = async () => {
    await withLoading(setApproving, async () => {
      await approveOutreach(vendor.id)
      onClose()
    }, 'Failed to approve outreach')
  }

  const latestParsedMessage = messages
    .filter((m) => m.parsed_responses)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

  return (
    <Dialog open={!!vendor} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0 flex flex-col gap-0 focus:outline-none" showCloseButton={false}>
        {/* Sticky Header */}
        <DialogHeader className="sticky top-0 bg-background z-10 px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center justify-between gap-4">
            <VendorNameDisplay
              name={vendor.name}
              rating={vendor.rating}
              website={vendor.website}
            />
            <div className="flex items-center gap-3">
              {thread && !isNotContacted && (
                <Badge
                  variant={
                    thread.status === 'VIABLE' ? 'default'
                    : thread.status === 'ESCALATION' ? 'destructive'
                    : 'secondary'
                  }
                >
                  {thread.status}
                </Badge>
              )}
              {isNotContacted && (
                <Badge variant="outline" className="text-muted-foreground">
                  Not Contacted
                </Badge>
              )}
              <DialogClose className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none cursor-pointer">
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Details for {vendor.name}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            {/* Escalation Context Panel */}
            {isEscalation && thread && (
              <EscalationContextPanel
                thread={thread}
                parsedResponse={latestParsedMessage?.parsed_responses}
                vendorName={vendor.name}
                onSendResponse={async (message) => {
                  await withLoading(setEscalationLoading, async () => {
                    await escalateThread(thread.id, message)
                    onClose()
                  }, 'Failed to send response')
                }}
                onApprove={async () => {
                  await withLoading(setEscalationLoading, async () => {
                    await updateThreadStatus(thread.id, 'VIABLE')
                    onClose()
                  }, 'Failed to approve vendor')
                }}
                onReject={async () => {
                  await withLoading(setEscalationLoading, async () => {
                    await updateThreadStatus(thread.id, 'REJECTED')
                    onClose()
                  }, 'Failed to reject vendor')
                }}
                loading={escalationLoading}
              />
            )}

            {/* Vendor Details Grid */}
            <VendorDetailsGrid
              vendor={vendor}
              editingField={editingField}
              onStartEdit={handleStartEdit}
              onSave={handleSaveField}
            />

            {/* Outreach Message */}
            <OutreachMessageSection
              vendor={vendor}
              canApprove={canApprove}
              onApprove={handleApproveOutreach}
              approving={approving}
            />

            {/* Location */}
            <LocationSection vendor={vendor} currentLocation={currentLocation} />

            {/* Message Timeline */}
            <div>
              <h3 className="mb-4 text-lg font-semibold">Message Thread</h3>
              <MessageTimeline messages={messages} />
            </div>

            {/* Parsed Facts Panel */}
            {latestParsedMessage?.parsed_responses && (
              <ParsedFactsCard parsed={latestParsedMessage.parsed_responses} />
            )}

            {/* System Reasoning */}
            {thread?.reason && (
              <Accordion type="single" collapsible>
                <AccordionItem value="reasoning">
                  <AccordionTrigger>System Reasoning</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-semibold">Decision: </span>
                        {thread.decision || 'Not decided'}
                      </div>
                      <div>
                        <span className="font-semibold">Reason: </span>
                        {thread.reason}
                      </div>
                      {thread.confidence && (
                        <div>
                          <span className="font-semibold">Confidence: </span>
                          {thread.confidence}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
