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
import { VendorWithThread, VendorStatus, DecisionOutcome, ConfidenceLevel } from '@/types/database'
import { StatusBadge, DecisionBadge, ConfidenceBadge } from './status-badge'
import { EmptyState } from './empty-state'
import { VendorNameDisplay, VendorEmailDisplay } from './vendor-display'
import { updateVendor, regenerateVendorMessage } from '@/app/actions/vendors'
import { normalizeJoinResult } from '@/lib/utils'
// Note: startOutreachByCategory is not used - outreach is simulated for demo purposes
import { sortCategories, groupByCategory } from '@/lib/entities'
import { Mail, CheckCircle2, Loader2 } from 'lucide-react'

interface VendorsTableProps {
  vendors: VendorWithThread[]
  eventId: string
  onVendorClick: (vendor: VendorWithThread) => void
}

// Outreach simulation state
interface OutreachSimulation {
  isActive: boolean
  category: string | null
  currentVendorId: string | null
  processedVendorIds: Set<string>
  progress: number
  totalCount: number
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

export function VendorsTable({ vendors, eventId, onVendorClick }: VendorsTableProps) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)

  // Outreach simulation state
  const [simulation, setSimulation] = useState<OutreachSimulation>({
    isActive: false,
    category: null,
    currentVendorId: null,
    processedVendorIds: new Set(),
    progress: 0,
    totalCount: 0,
  })

  // Simulate outreach for a category (UI only - no actual emails sent)
  const simulateOutreach = useCallback(async (category: string, vendorsToProcess: VendorWithThread[]) => {
    const notContactedVendors = vendorsToProcess.filter(v => {
      const thread = normalizeJoinResult(v.vendor_threads)
      return thread?.status === 'NOT_CONTACTED'
    })

    if (notContactedVendors.length === 0) return

    // Initialize simulation
    setSimulation({
      isActive: true,
      category,
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
      category: null,
      currentVendorId: null,
      processedVendorIds: new Set(),
      progress: 0,
      totalCount: 0,
    })
  }, [])

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

    // Simulation state for this vendor
    const isSending = simulation.currentVendorId === vendor.id
    const wasSent = simulation.processedVendorIds.has(vendor.id)
    const isInActiveSimulation = simulation.isActive && simulation.category === vendor.category

    return (
      <TableRow
        key={vendor.id}
        className={`cursor-pointer hover:bg-muted transition-all duration-300 ${
          isSending ? 'bg-blue-50 dark:bg-blue-950/30' : ''
        } ${wasSent ? 'bg-green-50 dark:bg-green-950/20' : ''}`}
        onClick={() => !isEditing && !simulation.isActive && onVendorClick(vendor)}
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
            <VendorNameDisplay
              name={vendor.name}
              rating={vendor.rating}
              website={vendor.website}
              discoverySource={vendor.discovery_source}
              showDiscoveryBadge
            />
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
            <VendorEmailDisplay
              email={vendor.contact_email}
              emailConfidence={vendor.email_confidence}
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
          ) : thread ? (
            <StatusBadge status={thread.status as VendorStatus} />
          ) : null}
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
    if (simulation.isActive) return

    const categoryVendors = pipelineByCategory[category] || []
    await simulateOutreach(category, categoryVendors)
  }

  const renderCategorySection = (categoryGroups: Record<string, VendorWithThread[]>, showActions: boolean = true) => {
    const categories = sortCategories(Object.keys(categoryGroups))

    return categories.map(category => {
      const categoryVendors = categoryGroups[category]
      const notContactedCount = categoryVendors.filter(v => {
        const thread = normalizeJoinResult(v.vendor_threads)
        return thread?.status === 'NOT_CONTACTED'
      }).length

      const isSimulatingThisCategory = simulation.isActive && simulation.category === category

      return (
        <div key={category} className="mb-6 last:mb-0">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h4 className="text-sm font-medium text-muted-foreground">{category}s ({categoryVendors.length})</h4>
              {isSimulatingThisCategory && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Mail className="w-4 h-4 animate-pulse" />
                  <span>Sending {simulation.processedVendorIds.size} of {simulation.totalCount}...</span>
                </div>
              )}
            </div>
            {showActions && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/events/${eventId}/vendors/discover?category=${encodeURIComponent(category)}`)}
                  disabled={simulation.isActive}
                >
                  Discover {category}s
                </Button>
                {notContactedCount > 0 && (
                  <Button
                    size="sm"
                    onClick={() => handleCategoryOutreach(category)}
                    disabled={simulation.isActive}
                  >
                    {isSimulatingThisCategory ? (
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
            )}
          </div>

          {/* Progress bar during simulation */}
          {isSimulatingThisCategory && (
            <div className="mb-3">
              <Progress value={simulation.progress} className="h-2" />
            </div>
          )}

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
