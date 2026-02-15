'use client'

import { useState, useRef, useCallback } from 'react'
import { useSelection } from '@/hooks/use-selection'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { VendorWithThread, VendorStatus } from '@/types/database'
import { StatusBadge } from './status-badge'
import { EmptyState } from './empty-state'
import { updateVendor, bulkDeleteVendors } from '@/app/actions/vendors'
import { normalizeJoinResult } from '@/lib/utils'
import { Checkbox } from './ui/checkbox'
import { Loader2, Trash2, X, ExternalLink } from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

interface VendorsTableProps {
  vendors: VendorWithThread[]
  eventId: string
  onVendorClick: (vendor: VendorWithThread) => void
  eventName?: string
  city?: string
  headcount?: number
  budget?: number
  neighborhoods?: string[]
  cuisines?: string[]
}

type EditableField = 'name' | 'price_per_person' | 'website' | 'contact_email' | 'custom_message'

interface EditingCell {
  vendorId: string
  field: EditableField
}

// ============================================================================
// Editable Cell
// ============================================================================

function EditableCell({
  value,
  vendorId,
  field,
  editingCell,
  onStartEdit,
  onSave,
  isLink,
  placeholder,
  className,
}: {
  value: string
  vendorId: string
  field: EditableField
  editingCell: EditingCell | null
  onStartEdit: (vendorId: string, field: EditableField) => void
  onSave: (vendorId: string, field: EditableField, value: string) => void
  isLink?: boolean
  placeholder?: string
  className?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const isEditing = editingCell?.vendorId === vendorId && editingCell?.field === field

  const handleBlur = () => {
    const newValue = inputRef.current?.value ?? value
    onSave(vendorId, field, newValue)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur()
    }
    if (e.key === 'Escape') {
      onSave(vendorId, field, value) // revert
    }
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        defaultValue={value}
        autoFocus
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`w-full bg-transparent outline-none text-sm py-0.5 border-b border-foreground/20 focus:border-foreground transition-colors ${className ?? ''}`}
        placeholder={placeholder}
        onClick={(e) => e.stopPropagation()}
      />
    )
  }

  const display = value || placeholder

  return (
    <div
      className={`group/cell cursor-text min-h-[24px] flex items-center text-sm rounded px-1 -mx-1 hover:bg-muted/60 transition-colors ${className ?? ''}`}
      onClick={(e) => {
        e.stopPropagation()
        onStartEdit(vendorId, field)
      }}
    >
      {isLink && value ? (
        <a
          href={value.startsWith('http') ? value : `https://${value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-600 hover:underline truncate max-w-[180px]"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="truncate">{value}</span>
          <ExternalLink className="w-3 h-3 shrink-0" />
        </a>
      ) : (
        <span className={value ? '' : 'text-muted-foreground/50'}>
          {display}
        </span>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function VendorsTable({
  vendors,
  eventId,
  onVendorClick,
  eventName,
  city,
  headcount,
  budget,
  neighborhoods,
  cuisines,
}: VendorsTableProps) {
  const router = useRouter()

  // Editing
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [savingCell, setSavingCell] = useState<string | null>(null) // "vendorId:field"

  // Selection
  const { selectedIds, toggle: toggleSelection, toggleAll, clear: clearSelection, allSelected, someSelected, isSelected } = useSelection(vendors)
  const [isDeleting, setIsDeleting] = useState(false)

  // ============================================================================
  // Cell editing
  // ============================================================================

  const handleStartEdit = useCallback((vendorId: string, field: EditableField) => {
    setEditingCell({ vendorId, field })
  }, [])

  const handleSaveCell = useCallback(async (vendorId: string, field: EditableField, newValue: string) => {
    setEditingCell(null)

    // Find original value
    const vendor = vendors.find(v => v.id === vendorId)
    if (!vendor) return

    const originalValue = (vendor[field] as string) ?? ''
    if (newValue === originalValue) return // no change

    const cellKey = `${vendorId}:${field}`
    setSavingCell(cellKey)
    try {
      await updateVendor(vendorId, { [field]: newValue || null })
    } catch (error) {
      console.error('Failed to update vendor:', error)
    } finally {
      setSavingCell(null)
    }
  }, [vendors])

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setIsDeleting(true)
    try {
      await bulkDeleteVendors(Array.from(selectedIds), eventId)
      clearSelection()
    } catch (error) {
      console.error('Failed to delete vendors:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  // ============================================================================
  // Empty state
  // ============================================================================

  if (vendors.length === 0) {
    let description = 'Add vendors manually or import from CSV'
    if (city && headcount) {
      const location = neighborhoods?.length
        ? `${neighborhoods.join(', ')} (${city})`
        : city
      const cuisineText = cuisines?.length
        ? ` serving ${cuisines.join(', ')} cuisine`
        : ''
      description = `Find food vendors in ${location} for ${headcount} guests${budget ? ` with a $${budget.toLocaleString()} budget` : ''}${cuisineText}`
    }

    return (
      <EmptyState
        variant="dashed"
        title="No vendors yet"
        description={description}
        action={{
          label: 'Import CSV',
          onClick: () => router.push(`/events/${eventId}/vendors/import`),
        }}
      />
    )
  }

  // ============================================================================
  // Render
  // ============================================================================


  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Vendors</h2>
        <Button
          variant="outline"
          onClick={() => router.push(`/events/${eventId}/vendors/import`)}
        >
          Import CSV
        </Button>
      </div>

      {/* Selection bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">
              {selectedIds.size} vendor{selectedIds.size !== 1 ? 's' : ''} selected
            </span>
            <Button variant="ghost" size="sm" onClick={clearSelection} className="h-8 px-2 text-muted-foreground">
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          </div>
          <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={isDeleting}>
            {isDeleting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...</>
            ) : (
              <><Trash2 className="w-4 h-4 mr-2" /> Delete Selected</>
            )}
          </Button>
        </div>
      )}

      {/* Editable table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={allSelected}
                  data-state={someSelected ? 'indeterminate' : allSelected ? 'checked' : 'unchecked'}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead className="min-w-[160px]">Vendor Name</TableHead>
              <TableHead className="min-w-[130px]">Price / Person</TableHead>
              <TableHead className="min-w-[160px]">Link</TableHead>
              <TableHead className="min-w-[180px]">Contact</TableHead>
              <TableHead className="min-w-[200px]">Outreach Message</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map(vendor => {
              const thread = normalizeJoinResult(vendor.vendor_threads)
              const selected = isSelected(vendor.id)

              return (
                <TableRow
                  key={vendor.id}
                  className={`${selected ? 'bg-muted/50' : ''} hover:bg-muted/30`}
                >
                  <TableCell className="w-[40px]" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected}
                      onCheckedChange={() => toggleSelection(vendor.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <EditableCell
                      value={vendor.name}
                      vendorId={vendor.id}
                      field="name"
                      editingCell={editingCell}
                      onStartEdit={handleStartEdit}
                      onSave={handleSaveCell}
                      placeholder="Vendor name"
                      className="font-medium"
                    />
                  </TableCell>
                  <TableCell>
                    <EditableCell
                      value={vendor.price_per_person ?? ''}
                      vendorId={vendor.id}
                      field="price_per_person"
                      editingCell={editingCell}
                      onStartEdit={handleStartEdit}
                      onSave={handleSaveCell}
                      placeholder="—"
                    />
                  </TableCell>
                  <TableCell>
                    <EditableCell
                      value={vendor.website ?? ''}
                      vendorId={vendor.id}
                      field="website"
                      editingCell={editingCell}
                      onStartEdit={handleStartEdit}
                      onSave={handleSaveCell}
                      isLink
                      placeholder="—"
                    />
                  </TableCell>
                  <TableCell>
                    <EditableCell
                      value={vendor.contact_email}
                      vendorId={vendor.id}
                      field="contact_email"
                      editingCell={editingCell}
                      onStartEdit={handleStartEdit}
                      onSave={handleSaveCell}
                      placeholder="email"
                    />
                  </TableCell>
                  <TableCell>
                    <EditableCell
                      value={vendor.custom_message ?? ''}
                      vendorId={vendor.id}
                      field="custom_message"
                      editingCell={editingCell}
                      onStartEdit={handleStartEdit}
                      onSave={handleSaveCell}
                      placeholder="—"
                    />
                  </TableCell>
                  <TableCell>
                    {thread ? (
                      <StatusBadge status={thread.status as VendorStatus} />
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">New</Badge>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
