'use client'

import { useState } from 'react'
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
import { VendorWithThread, VendorStatus, MessageSender } from '@/types/database'
import { StatusBadge } from './status-badge'
import { EmptyState } from './empty-state'
import { bulkDeleteVendors, createVendor } from '@/app/actions/vendors'
import { normalizeJoinResult } from '@/lib/utils'
import { Checkbox } from './ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Loader2, Plus, Trash2, X } from 'lucide-react'

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

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get the most recent message from a vendor's thread messages.
 */
function getLatestMessage(vendor: VendorWithThread): { sender: MessageSender; body: string } | null {
  const thread = normalizeJoinResult(vendor.vendor_threads)
  const messages = (thread as Record<string, unknown> | null)?.messages as
    | { body: string; sender: MessageSender; created_at: string }[]
    | undefined

  if (!messages || messages.length === 0) return null

  const sorted = [...messages].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return { sender: sorted[0].sender, body: sorted[0].body }
}

/**
 * Format sender label for display.
 */
function formatSender(sender: MessageSender): string {
  switch (sender) {
    case 'SYSTEM':
      return 'You'
    case 'HUMAN':
      return 'You'
    case 'VENDOR':
      return 'Vendor'
    default:
      return sender
  }
}

/**
 * Client-side fallback summary when vendor.summary is not yet generated.
 */
function composeFallbackSummary(vendor: VendorWithThread): string {
  const parts: string[] = []
  if (vendor.cuisine) parts.push(vendor.cuisine)
  if (vendor.price_per_person) parts.push(vendor.price_per_person)
  if (vendor.has_private_dining) parts.push('Private dining')
  if (parts.length > 0) return parts.join(' · ')
  return vendor.category || 'Vendor'
}

// ============================================================================
// Add Vendor Dialog
// ============================================================================

function AddVendorDialog({
  open,
  onOpenChange,
  newVendor,
  setNewVendor,
  isCreating,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  newVendor: { name: string; category: string; contact_email: string }
  setNewVendor: (v: { name: string; category: string; contact_email: string }) => void
  isCreating: boolean
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Vendor</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vendor-name">Name</Label>
            <Input
              id="vendor-name"
              placeholder="Vendor name"
              value={newVendor.name}
              onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vendor-category">Category</Label>
            <Input
              id="vendor-category"
              placeholder="Vendor (optional)"
              value={newVendor.category}
              onChange={(e) => setNewVendor({ ...newVendor, category: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vendor-email">Contact Email</Label>
            <Input
              id="vendor-email"
              type="email"
              placeholder="vendor@example.com"
              value={newVendor.contact_email}
              onChange={(e) => setNewVendor({ ...newVendor, contact_email: e.target.value })}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding...</>
              ) : (
                'Add Vendor'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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

  // Selection
  const { selectedIds, toggle: toggleSelection, toggleAll, clear: clearSelection, allSelected, someSelected, isSelected } = useSelection(vendors)
  const [isDeleting, setIsDeleting] = useState(false)

  // Add vendor dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newVendor, setNewVendor] = useState({ name: '', category: '', contact_email: '' })

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    try {
      await createVendor(eventId, {
        name: newVendor.name,
        category: newVendor.category || 'Vendor',
        contact_email: newVendor.contact_email,
      })
      setNewVendor({ name: '', category: '', contact_email: '' })
      setAddDialogOpen(false)
    } catch (error) {
      console.error('Failed to create vendor:', error)
    } finally {
      setIsCreating(false)
    }
  }

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
      <>
        <EmptyState
          variant="dashed"
          title="No vendors yet"
          description={description}
          action={{
            label: 'Import CSV',
            onClick: () => router.push(`/events/${eventId}/vendors/import`),
          }}
          secondaryAction={{
            label: 'Add Vendor',
            onClick: () => setAddDialogOpen(true),
          }}
        />
        <AddVendorDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          newVendor={newVendor}
          setNewVendor={setNewVendor}
          isCreating={isCreating}
          onSubmit={handleAddVendor}
        />
      </>
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setAddDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Vendor
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/events/${eventId}/vendors/import`)}
          >
            Import CSV
          </Button>
        </div>
      </div>

      <AddVendorDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        newVendor={newVendor}
        setNewVendor={setNewVendor}
        isCreating={isCreating}
        onSubmit={handleAddVendor}
      />

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

      {/* Read-only table */}
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
              <TableHead className="min-w-[160px]">Name</TableHead>
              <TableHead className="min-w-[200px]">About</TableHead>
              <TableHead className="min-w-[240px]">Latest Message</TableHead>
              <TableHead className="w-[110px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map(vendor => {
              const thread = normalizeJoinResult(vendor.vendor_threads)
              const selected = isSelected(vendor.id)
              const latestMessage = getLatestMessage(vendor)
              const aboutText = vendor.summary || composeFallbackSummary(vendor)

              return (
                <TableRow
                  key={vendor.id}
                  className={`${selected ? 'bg-muted/50' : ''} hover:bg-muted/30 cursor-pointer`}
                  onClick={() => onVendorClick(vendor)}
                >
                  <TableCell className="w-[40px]" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected}
                      onCheckedChange={() => toggleSelection(vendor.id)}
                    />
                  </TableCell>

                  {/* Name */}
                  <TableCell>
                    <span className="text-sm font-medium">{vendor.name}</span>
                  </TableCell>

                  {/* About */}
                  <TableCell>
                    <span className="text-sm text-muted-foreground line-clamp-1">
                      {aboutText}
                    </span>
                  </TableCell>

                  {/* Latest Message */}
                  <TableCell>
                    {latestMessage ? (
                      <div className="text-sm line-clamp-1">
                        <span className="font-medium">{formatSender(latestMessage.sender)}:</span>{' '}
                        <span className="text-muted-foreground">
                          {latestMessage.body.replace(/\n/g, ' ').slice(0, 120)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground/50">No messages yet</span>
                    )}
                  </TableCell>

                  {/* Status */}
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
