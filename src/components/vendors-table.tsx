'use client'

import { useState } from 'react'
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
import { bulkStartOutreach } from '@/app/actions/threads'
import { normalizeJoinResult } from '@/lib/utils'

interface VendorsTableProps {
  vendors: VendorWithThread[]
  eventId: string
  onVendorClick: (vendor: VendorWithThread) => void
}

export function VendorsTable({ vendors, eventId, onVendorClick }: VendorsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)

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

  const handleStartBulkOutreach = async () => {
    setLoading(true)
    try {
      await bulkStartOutreach(eventId)
    } catch (error) {
      console.error('Failed to start bulk outreach:', error)
    } finally {
      setLoading(false)
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

  if (vendors.length === 0) {
    return (
      <EmptyState
        variant="dashed"
        title="No vendors yet"
        description="Discover venues based on your event criteria or import from CSV"
        action={{
          label: 'Discover Venues',
          onClick: () => (window.location.href = `/events/${eventId}/vendors/discover`),
        }}
        secondaryAction={{
          label: 'Import CSV',
          onClick: () => (window.location.href = `/events/${eventId}/vendors/import`),
        }}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h2 className="text-2xl font-bold">Vendors</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => (window.location.href = `/events/${eventId}/vendors/discover`)}
          >
            Discover More
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = `/events/${eventId}/vendors/import`)}
          >
            Import CSV
          </Button>
          <Button onClick={handleStartBulkOutreach} disabled={loading}>
            {loading ? 'Starting...' : 'Start Outreach (All)'}
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Contact Email</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Decision</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Last Touch</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map((vendor) => {
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
                        value={editData.category ?? vendor.category}
                        onChange={(e) =>
                          setEditData({ ...editData, category: e.target.value })
                        }
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      vendor.category
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
                    <div className="flex items-center gap-2">
                      <span className="max-w-[150px] truncate text-sm text-muted-foreground">
                        {vendor.custom_message
                          ? vendor.custom_message.substring(0, 40) + '...'
                          : 'No message'}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={(e) => handleRegenerateMessage(vendor.id, e)}
                        disabled={regeneratingId === vendor.id}
                      >
                        {regeneratingId === vendor.id ? '...' : '↻'}
                      </Button>
                    </div>
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
                    {thread?.confidence && (
                      <ConfidenceBadge confidence={thread.confidence as ConfidenceLevel} />
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
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
