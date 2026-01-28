'use client'

import { useState, useMemo } from 'react'
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
import { VendorWithThread, VendorStatus, DecisionOutcome, ConfidenceLevel } from '@/types/database'
import { StatusBadge, DecisionBadge, ConfidenceBadge } from './status-badge'
import { EmptyState } from './empty-state'
import { updateVendor, regenerateVendorMessage } from '@/app/actions/vendors'
import { startOutreachByCategory } from '@/app/actions/threads'
import { normalizeJoinResult } from '@/lib/utils'

interface VendorsTableProps {
  vendors: VendorWithThread[]
  eventId: string
  onVendorClick: (vendor: VendorWithThread) => void
}

// Helper to check if vendor is confirmed (VIABLE or DONE)
function isConfirmed(vendor: VendorWithThread): boolean {
  const thread = normalizeJoinResult(vendor.vendor_threads)
  return thread?.status === 'VIABLE' || thread?.status === 'DONE'
}

// Helper to check if vendor is rejected
function isRejected(vendor: VendorWithThread): boolean {
  const thread = normalizeJoinResult(vendor.vendor_threads)
  return thread?.status === 'REJECTED'
}

// Group vendors by category
function groupByCategory(vendors: VendorWithThread[]): Record<string, VendorWithThread[]> {
  return vendors.reduce((acc, vendor) => {
    const category = vendor.category || 'Other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(vendor)
    return acc
  }, {} as Record<string, VendorWithThread[]>)
}

// Category display order (Venue first, then alphabetical)
function sortCategories(categories: string[]): string[] {
  return categories.sort((a, b) => {
    if (a === 'Venue') return -1
    if (b === 'Venue') return 1
    return a.localeCompare(b)
  })
}

export function VendorsTable({ vendors, eventId, onVendorClick }: VendorsTableProps) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)

  // Separate vendors into confirmed, pipeline, and rejected
  const { confirmed, pipeline, rejected } = useMemo(() => {
    const confirmed: VendorWithThread[] = []
    const pipeline: VendorWithThread[] = []
    const rejected: VendorWithThread[] = []

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

  // Group each section by category
  const confirmedByCategory = useMemo(() => groupByCategory(confirmed), [confirmed])
  const pipelineByCategory = useMemo(() => groupByCategory(pipeline), [pipeline])

  const handleRegenerateMessage = async (vendorId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setRegeneratingId(vendorId)
    try {
      await regenerateVendorMessage(vendorId)
    } catch (error) {
      console.error('Failed to regenerate message:', error)
    } finally {
      setRegeneratingId(null)
    }
  }

  const handleSaveEdit = async (vendorId: string) => {
    try {
      await updateVendor(vendorId, editData)
      setEditingId(null)
      setEditData({})
    } catch (error) {
      console.error('Failed to update vendor:', error)
    }
  }

  const renderVendorRow = (vendor: VendorWithThread) => {
    const thread = normalizeJoinResult(vendor.vendor_threads)
    const isEditing = editingId === vendor.id

    return (
      <TableRow
        key={vendor.id}
        className="cursor-pointer hover:bg-muted"
        onClick={() => !isEditing && onVendorClick(vendor)}
      >
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
            <span className="font-medium">{vendor.name}</span>
          )}
        </TableCell>
        <TableCell>
          {isEditing ? (
            <Input
              value={editData.contact_email ?? vendor.contact_email}
              onChange={(e) =>
                setEditData({ ...editData, contact_email: e.target.value })
              }
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            vendor.contact_email
          )}
        </TableCell>
        <TableCell>
          {thread && <StatusBadge status={thread.status as VendorStatus} />}
        </TableCell>
        <TableCell>
          {thread?.decision && (
            <DecisionBadge decision={thread.decision as DecisionOutcome} />
          )}
        </TableCell>
        <TableCell>
          {thread?.last_touch
            ? formatDistanceToNow(new Date(thread.last_touch), {
                addSuffix: true,
              })
            : '-'}
        </TableCell>
      </TableRow>
    )
  }

  const handleCategoryOutreach = async (category: string) => {
    setLoading(true)
    try {
      await startOutreachByCategory(eventId, category)
    } catch (error) {
      console.error('Failed to start outreach:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderCategorySection = (categoryGroups: Record<string, VendorWithThread[]>, showActions: boolean = true) => {
    const categories = sortCategories(Object.keys(categoryGroups))
    
    return categories.map(category => {
      const categoryVendors = categoryGroups[category]
      const notContactedCount = categoryVendors.filter(v => {
        const thread = normalizeJoinResult(v.vendor_threads)
        return thread?.status === 'NOT_CONTACTED'
      }).length

      return (
        <div key={category} className="mb-6 last:mb-0">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-medium text-muted-foreground">{category}s ({categoryVendors.length})</h4>
            {showActions && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/events/${eventId}/vendors/discover?category=${encodeURIComponent(category)}`)}
                >
                  Discover {category}s
                </Button>
                {notContactedCount > 0 && (
                  <Button
                    size="sm"
                    onClick={() => handleCategoryOutreach(category)}
                    disabled={loading}
                  >
                    {loading ? 'Starting...' : `Start Outreach (${notContactedCount})`}
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Decision</TableHead>
                  <TableHead>Last Touch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryVendors.map(renderVendorRow)}
              </TableBody>
            </Table>
          </div>
        </div>
      )
    })
  }

  if (vendors.length === 0) {
    return (
      <EmptyState
        variant="dashed"
        title="No vendors yet"
        description="Discover venues based on your event criteria or import from CSV"
        action={{
          label: 'Discover',
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
      <div className="flex justify-between">
        <h2 className="text-2xl font-bold">Vendors</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/events/${eventId}/vendors/discover`)}
          >
            Discover All
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/events/${eventId}/vendors/import`)}
          >
            Import CSV
          </Button>
        </div>
      </div>

      {/* Confirmed Section */}
      {confirmed.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-lg font-semibold">Confirmed</h3>
            <Badge variant="default" className="bg-green-600">{confirmed.length}</Badge>
          </div>
          {renderCategorySection(confirmedByCategory, false)}
        </div>
      )}

      {/* Pipeline Section */}
      {pipeline.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-lg font-semibold">Pipeline</h3>
            <Badge variant="secondary">{pipeline.length}</Badge>
          </div>
          {renderCategorySection(pipelineByCategory)}
        </div>
      )}

      {/* Rejected Section (collapsed by default) */}
      {rejected.length > 0 && (
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
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Contact Email</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rejected.map(vendor => {
                  const thread = normalizeJoinResult(vendor.vendor_threads)
                  return (
                    <TableRow key={vendor.id} className="cursor-pointer hover:bg-muted" onClick={() => onVendorClick(vendor)}>
                      <TableCell className="font-medium">{vendor.name}</TableCell>
                      <TableCell>{vendor.category}</TableCell>
                      <TableCell>{vendor.contact_email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{thread?.reason || '-'}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </details>
      )}
    </div>
  )
}
