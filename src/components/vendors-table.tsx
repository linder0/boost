'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { EntityWithStatus, EntityStatus } from '@/types/database'
import { DisplayEntity, toDisplayEntity } from '@/types/entities'
import { StatusBadge } from './status-badge'
import { EmptyState } from './empty-state'
import { VendorNameDisplay, VendorEmailDisplay } from './vendor-display'
import { bulkRemoveEntitiesFromEvent, updateEventEntityStatus } from '@/app/actions/entities'
import { Checkbox } from './ui/checkbox'
import { Mail, CheckCircle2, Loader2, Users, DollarSign, Trash2, X } from 'lucide-react'

interface VendorsTableProps {
  vendors: EntityWithStatus[]
  eventId: string
  onVendorClick: (vendor: EntityWithStatus) => void
  // Event info for contextual empty states
  eventName?: string
  city?: string
  headcount?: number
  budget?: number
  neighborhoods?: string[]
  cuisines?: string[]
}

// Outreach simulation state
interface OutreachSimulation {
  isActive: boolean
  currentVendorId: string | null
  processedVendorIds: Set<string>
  progress: number
  totalCount: number
}

// Helper to check if entity is confirmed
function isConfirmed(entity: EntityWithStatus): boolean {
  const status = entity.event_entity?.status
  return status === 'confirmed'
}

// Helper to check if entity is rejected
function isRejected(entity: EntityWithStatus): boolean {
  const status = entity.event_entity?.status
  return status === 'rejected'
}

// Format private dining capacity from metadata
function formatCapacity(entity: EntityWithStatus): string {
  const min = entity.metadata?.private_dining_capacity_min
  const max = entity.metadata?.private_dining_capacity_max
  if (min && max) return `${min}-${max}`
  if (max) return `Up to ${max}`
  if (min) return `${min}+`
  return '-'
}

// Format private dining minimum spend from metadata
function formatMinimum(entity: EntityWithStatus): string {
  const min = entity.metadata?.private_dining_minimum
  if (!min) return '-'
  return `$${min.toLocaleString()}`
}

// Map entity status to display status
function mapStatusToDisplay(status?: EntityStatus): string {
  switch (status) {
    case 'discovered': return 'NOT_CONTACTED'
    case 'contacted': return 'WAITING'
    case 'responded': return 'PARSED'
    case 'confirmed': return 'VIABLE'
    case 'rejected': return 'REJECTED'
    default: return 'NOT_CONTACTED'
  }
}

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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Record<string, string>>({})

  // Outreach simulation state
  const [simulation, setSimulation] = useState<OutreachSimulation>({
    isActive: false,
    currentVendorId: null,
    processedVendorIds: new Set(),
    progress: 0,
    totalCount: 0,
  })

  // Selection state for bulk operations
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)

  // Simulate outreach for all not-contacted restaurants
  const simulateOutreach = useCallback(async (vendorsToProcess: EntityWithStatus[]) => {
    const notContactedVendors = vendorsToProcess.filter(v => {
      return v.event_entity?.status === 'discovered'
    })

    if (notContactedVendors.length === 0) return

    // Initialize simulation
    setSimulation({
      isActive: true,
      currentVendorId: null,
      processedVendorIds: new Set(),
      progress: 0,
      totalCount: notContactedVendors.length,
    })

    // Process each vendor with a delay for visual effect
    for (let i = 0; i < notContactedVendors.length; i++) {
      const vendor = notContactedVendors[i]

      // Set current vendor (sending state)
      setSimulation(prev => ({
        ...prev,
        currentVendorId: vendor.id,
        progress: Math.round(((i) / notContactedVendors.length) * 100),
      }))

      // Wait a bit to show "sending" state
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400))

      // Update status to contacted
      await updateEventEntityStatus(eventId, vendor.id, 'contacted')

      // Mark as processed
      setSimulation(prev => ({
        ...prev,
        processedVendorIds: new Set([...prev.processedVendorIds, vendor.id]),
        progress: Math.round(((i + 1) / notContactedVendors.length) * 100),
      }))

      // Small delay before next
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    // Complete simulation
    await new Promise(resolve => setTimeout(resolve, 500))
    setSimulation({
      isActive: false,
      currentVendorId: null,
      processedVendorIds: new Set(),
      progress: 0,
      totalCount: 0,
    })
  }, [eventId])

  // Separate restaurants into confirmed, pipeline, and rejected
  const { confirmed, pipeline, rejected } = useMemo(() => {
    const confirmed: EntityWithStatus[] = []
    const pipeline: EntityWithStatus[] = []
    const rejected: EntityWithStatus[] = []

    vendors.forEach(vendor => {
      if (isConfirmed(vendor)) {
        confirmed.push(vendor)
      } else if (isRejected(vendor)) {
        rejected.push(vendor)
      } else {
        pipeline.push(vendor)
      }
    })

    return { confirmed, pipeline, rejected }
  }, [vendors])

  // Count not contacted for outreach button
  const notContactedCount = useMemo(() =>
    pipeline.filter(v => v.event_entity?.status === 'discovered').length
  , [pipeline])

  // Toggle individual vendor selection
  const toggleSelection = (vendorId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(vendorId)) {
        next.delete(vendorId)
      } else {
        next.add(vendorId)
      }
      return next
    })
  }

  // Toggle all vendors in a list
  const toggleAllInList = (list: EntityWithStatus[]) => {
    const listIds = list.map(v => v.id)
    const allSelected = listIds.every(id => selectedIds.has(id))

    setSelectedIds(prev => {
      const next = new Set(prev)
      if (allSelected) {
        // Deselect all in this list
        listIds.forEach(id => next.delete(id))
      } else {
        // Select all in this list
        listIds.forEach(id => next.add(id))
      }
      return next
    })
  }

  // Check selection state for a list
  const getListSelectionState = (list: EntityWithStatus[]) => {
    const listIds = list.map(v => v.id)
    const selectedCount = listIds.filter(id => selectedIds.has(id)).length
    return {
      allSelected: selectedCount === listIds.length && listIds.length > 0,
      someSelected: selectedCount > 0 && selectedCount < listIds.length,
      selectedCount,
    }
  }

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return

    setIsDeleting(true)
    try {
      await bulkRemoveEntitiesFromEvent(eventId, Array.from(selectedIds))
      setSelectedIds(new Set())
    } catch (error) {
      console.error('Failed to delete vendors:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  // Clear selection
  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  const renderRestaurantRow = (vendor: EntityWithStatus) => {
    const isEditing = editingId === vendor.id
    const isSelected = selectedIds.has(vendor.id)
    const status = vendor.event_entity?.status

    // Simulation state for this vendor
    const isSending = simulation.currentVendorId === vendor.id
    const wasSent = simulation.processedVendorIds.has(vendor.id)

    // Get display values from metadata
    const email = vendor.metadata?.email || ''
    const emailConfidence = vendor.metadata?.email_confidence
    const rating = vendor.metadata?.rating
    const website = vendor.website
    const discoverySource = vendor.metadata?.discovery_source
    const cuisine = vendor.metadata?.cuisine

    return (
      <TableRow
        key={vendor.id}
        className={`cursor-pointer hover:bg-muted transition-all duration-300 ${
          isSending ? 'bg-blue-50 dark:bg-blue-950/30' : ''
        } ${wasSent ? 'bg-green-50 dark:bg-green-950/20' : ''} ${
          isSelected ? 'bg-muted/50' : ''
        }`}
        onClick={() => !isEditing && !simulation.isActive && onVendorClick(vendor)}
      >
        <TableCell className="w-[40px]" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleSelection(vendor.id)}
          />
        </TableCell>
        <TableCell>
          {isEditing ? (
            <Input
              value={editData.name ?? vendor.name}
              onChange={(e) =>
                setEditData({ ...editData, name: e.target.value })
              }
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="space-y-1">
              <VendorNameDisplay
                name={vendor.name}
                rating={rating}
                website={website}
                discoverySource={discoverySource}
                showDiscoveryBadge
              />
              {cuisine && (
                <span className="text-xs text-muted-foreground">{cuisine}</span>
              )}
            </div>
          )}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3 text-muted-foreground" />
            <span>{formatCapacity(vendor)}</span>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-muted-foreground" />
            <span>{formatMinimum(vendor)}</span>
          </div>
        </TableCell>
        <TableCell>
          {isEditing ? (
            <Input
              value={editData.email ?? email}
              onChange={(e) =>
                setEditData({ ...editData, email: e.target.value })
              }
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <VendorEmailDisplay
              email={email}
              emailConfidence={emailConfidence}
            />
          )}
        </TableCell>
        <TableCell>
          {isSending ? (
            <Badge className="bg-blue-500 text-white animate-pulse">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Sending...
            </Badge>
          ) : wasSent ? (
            <Badge className="bg-green-500 text-white">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Sent
            </Badge>
          ) : status ? (
            <StatusBadge status={mapStatusToDisplay(status)} />
          ) : null}
        </TableCell>
        <TableCell>
          {/* Decision column - placeholder for future thread integration */}
          {status === 'confirmed' && (
            <Badge variant="default" className="bg-green-600">Confirmed</Badge>
          )}
          {status === 'rejected' && (
            <Badge variant="destructive">Rejected</Badge>
          )}
        </TableCell>
        <TableCell className="text-right">
          {vendor.updated_at
            ? formatDistanceToNow(new Date(vendor.updated_at), {
                addSuffix: true,
              })
            : '-'}
        </TableCell>
      </TableRow>
    )
  }

  const renderTable = (restaurantList: EntityWithStatus[], showActions: boolean = true) => {
    const { allSelected, someSelected } = getListSelectionState(restaurantList)

    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={allSelected}
                  data-state={someSelected ? 'indeterminate' : allSelected ? 'checked' : 'unchecked'}
                  onCheckedChange={() => toggleAllInList(restaurantList)}
                />
              </TableHead>
              <TableHead>Restaurant</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Minimum</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Decision</TableHead>
              <TableHead className="text-right">Last Touch</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {restaurantList.map(renderRestaurantRow)}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (vendors.length === 0) {
    // Build contextual description based on event info
    let description = 'Discover restaurants based on your event criteria or import from CSV'
    if (city && headcount) {
      // Build location string with neighborhoods
      const location = neighborhoods?.length
        ? `${neighborhoods.join(', ')} (${city})`
        : city
      // Build cuisine string
      const cuisineText = cuisines?.length
        ? ` serving ${cuisines.join(', ')} cuisine`
        : ''
      description = `Find private dining options in ${location} for ${headcount} guests${budget ? ` with a $${budget.toLocaleString()} budget` : ''}${cuisineText}`
    }

    return (
      <EmptyState
        variant="dashed"
        title="No restaurants yet"
        description={description}
        action={{
          label: 'Discover Restaurants',
          onClick: () => router.push(`/events/${eventId}/vendors/discover`),
        }}
        secondaryAction={{
          label: 'Import CSV',
          onClick: () => router.push(`/events/${eventId}/vendors/import`),
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Restaurants</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/events/${eventId}/vendors/discover`)}
          >
            Discover More
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/events/${eventId}/vendors/import`)}
          >
            Import CSV
          </Button>
        </div>
      </div>

      {/* Selection action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">
              {selectedIds.size} restaurant{selectedIds.size !== 1 ? 's' : ''} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="h-8 px-2 text-muted-foreground"
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected
              </>
            )}
          </Button>
        </div>
      )}

      {/* Progress bar during simulation */}
      {simulation.isActive && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <Mail className="w-4 h-4 animate-pulse" />
            <span>Sending outreach {simulation.processedVendorIds.size} of {simulation.totalCount}...</span>
          </div>
          <Progress value={simulation.progress} className="h-2" />
        </div>
      )}

      {/* Confirmed Section */}
      {confirmed.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-lg font-semibold">Confirmed</h3>
            <Badge variant="default" className="bg-green-600">{confirmed.length}</Badge>
          </div>
          {renderTable(confirmed, false)}
        </div>
      )}

      {/* Pipeline Section */}
      {pipeline.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Pipeline</h3>
              <Badge variant="secondary">{pipeline.length}</Badge>
            </div>
            {notContactedCount > 0 && (
              <Button
                onClick={() => simulateOutreach(pipeline)}
                disabled={simulation.isActive}
              >
                {simulation.isActive ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  `Start Outreach (${notContactedCount})`
                )}
              </Button>
            )}
          </div>
          {renderTable(pipeline)}
        </div>
      )}

      {/* Rejected Section (collapsed by default) */}
      {rejected.length > 0 && (() => {
        const { allSelected: rejectedAllSelected, someSelected: rejectedSomeSelected } = getListSelectionState(rejected)
        return (
          <details className="group">
            <summary className="mb-3 flex cursor-pointer items-center gap-2 list-none">
              <h3 className="text-lg font-semibold text-muted-foreground">Rejected</h3>
              <Badge variant="outline" className="text-muted-foreground">{rejected.length}</Badge>
              <span className="text-xs text-muted-foreground group-open:hidden">(click to expand)</span>
            </summary>
            <div className="rounded-md border opacity-60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={rejectedAllSelected}
                        data-state={rejectedSomeSelected ? 'indeterminate' : rejectedAllSelected ? 'checked' : 'unchecked'}
                        onCheckedChange={() => toggleAllInList(rejected)}
                      />
                    </TableHead>
                    <TableHead>Restaurant</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rejected.map(vendor => {
                    const isSelected = selectedIds.has(vendor.id)
                    return (
                      <TableRow
                        key={vendor.id}
                        className={`cursor-pointer hover:bg-muted ${isSelected ? 'bg-muted/50' : ''}`}
                        onClick={() => onVendorClick(vendor)}
                      >
                        <TableCell className="w-[40px]" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelection(vendor.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{vendor.name}</TableCell>
                        <TableCell>{vendor.metadata?.email || '-'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{vendor.event_entity?.notes || '-'}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </details>
        )
      })()}
    </div>
  )
}
