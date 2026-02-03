'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Button } from './ui/button'
import { Checkbox } from './ui/checkbox'
import { Badge } from './ui/badge'
import { Textarea } from './ui/textarea'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog'
import { VendorWithThread } from '@/types/database'
import { normalizeJoinResult } from '@/lib/utils'
import { sortCategories, groupByCategory } from '@/lib/entities'
import { approveOutreach, bulkApproveOutreach } from '@/app/actions/threads'
import { updateVendorMessage, regenerateVendorMessage } from '@/app/actions/vendors'

interface OutreachQueueProps {
  vendors: VendorWithThread[]
  eventId: string
  eventName: string
}

export function OutreachQueue({ vendors, eventId, eventName }: OutreachQueueProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null)
  const [editedMessage, setEditedMessage] = useState('')
  const [previewVendor, setPreviewVendor] = useState<VendorWithThread | null>(null)
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)

  // Filter to only show vendors pending approval
  const pendingVendors = useMemo(() => {
    return vendors.filter((v) => {
      const thread = normalizeJoinResult(v.vendor_threads)
      return thread?.status === 'NOT_CONTACTED' && !thread?.outreach_approved
    })
  }, [vendors])

  // Group by category
  const groupedVendors = useMemo(() => {
    return groupByCategory(pendingVendors)
  }, [pendingVendors])

  const sortedCategories = useMemo(() => {
    return sortCategories(Object.keys(groupedVendors))
  }, [groupedVendors])

  // Toggle selection
  const toggleVendor = (vendorId: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(vendorId)) {
      newSelected.delete(vendorId)
    } else {
      newSelected.add(vendorId)
    }
    setSelectedIds(newSelected)
  }

  const toggleAll = () => {
    if (selectedIds.size === pendingVendors.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pendingVendors.map((v) => v.id)))
    }
  }

  const toggleCategory = (categoryVendors: VendorWithThread[]) => {
    const categoryIds = categoryVendors.map((v) => v.id)
    const allSelected = categoryIds.every((id) => selectedIds.has(id))
    
    const newSelected = new Set(selectedIds)
    categoryIds.forEach((id) => {
      if (allSelected) {
        newSelected.delete(id)
      } else {
        newSelected.add(id)
      }
    })
    setSelectedIds(newSelected)
  }

  // Approve selected vendors
  const handleApproveSelected = async () => {
    if (selectedIds.size === 0) return
    
    setLoading(true)
    try {
      await bulkApproveOutreach(Array.from(selectedIds))
      setSelectedIds(new Set())
      router.refresh()
    } catch (error) {
      console.error('Failed to approve outreach:', error)
    } finally {
      setLoading(false)
    }
  }

  // Approve single vendor
  const handleApproveSingle = async (vendorId: string) => {
    setLoading(true)
    try {
      await approveOutreach(vendorId)
      router.refresh()
    } catch (error) {
      console.error('Failed to approve outreach:', error)
    } finally {
      setLoading(false)
    }
  }

  // Save edited message
  const handleSaveMessage = async () => {
    if (!editingVendorId) return
    
    setLoading(true)
    try {
      await updateVendorMessage(editingVendorId, editedMessage)
      setEditingVendorId(null)
      setEditedMessage('')
      router.refresh()
    } catch (error) {
      console.error('Failed to save message:', error)
    } finally {
      setLoading(false)
    }
  }

  // Regenerate message
  const handleRegenerate = async (vendorId: string) => {
    setRegeneratingId(vendorId)
    try {
      const newMessage = await regenerateVendorMessage(vendorId)
      if (editingVendorId === vendorId) {
        setEditedMessage(newMessage)
      }
      router.refresh()
    } catch (error) {
      console.error('Failed to regenerate message:', error)
    } finally {
      setRegeneratingId(null)
    }
  }

  if (pendingVendors.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            No vendors pending outreach approval.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Add vendors via discovery or import to get started.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => router.push(`/events/${eventId}/vendors/discover`)}
            >
              Discover Vendors
            </Button>
            <Button 
              variant="outline"
              onClick={() => router.push(`/events/${eventId}/vendors/import`)}
            >
              Import CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Outreach Queue</h2>
          <p className="text-muted-foreground">
            Review and approve outreach messages before sending
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} of {pendingVendors.length} selected
          </span>
          <Button variant="ghost" size="sm" onClick={toggleAll}>
            {selectedIds.size === pendingVendors.length ? 'Deselect All' : 'Select All'}
          </Button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3 flex items-center justify-between">
            <span className="text-sm font-medium">
              {selectedIds.size} vendor{selectedIds.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApproveSelected}
                disabled={loading}
              >
                {loading ? 'Approving...' : `Approve & Send (${selectedIds.size})`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vendor groups */}
      {sortedCategories.map((category) => {
        const categoryVendors = groupedVendors[category]
        const categorySelectedCount = categoryVendors.filter((v) => 
          selectedIds.has(v.id)
        ).length

        return (
          <div key={category} className="space-y-3">
            {/* Category header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={categorySelectedCount === categoryVendors.length}
                  onCheckedChange={() => toggleCategory(categoryVendors)}
                />
                <h3 className="text-lg font-semibold">{category}s</h3>
                <Badge variant="secondary">{categoryVendors.length}</Badge>
              </div>
            </div>

            {/* Vendor cards */}
            <div className="space-y-3">
              {categoryVendors.map((vendor) => (
                <Card key={vendor.id} className={selectedIds.has(vendor.id) ? 'ring-2 ring-primary' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedIds.has(vendor.id)}
                          onCheckedChange={() => toggleVendor(vendor.id)}
                        />
                        <div>
                          <CardTitle className="text-base">{vendor.name}</CardTitle>
                          <CardDescription>{vendor.contact_email}</CardDescription>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewVendor(vendor)}
                        >
                          Preview
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRegenerate(vendor.id)}
                          disabled={regeneratingId === vendor.id}
                        >
                          {regeneratingId === vendor.id ? 'Regenerating...' : 'Regenerate'}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApproveSingle(vendor.id)}
                          disabled={loading}
                        >
                          Approve & Send
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="message" className="border-0">
                        <AccordionTrigger className="py-2 text-sm">
                          {editingVendorId === vendor.id ? 'Editing message...' : 'View/Edit message'}
                        </AccordionTrigger>
                        <AccordionContent>
                          {editingVendorId === vendor.id ? (
                            <div className="space-y-3">
                              <Textarea
                                value={editedMessage}
                                onChange={(e) => setEditedMessage(e.target.value)}
                                rows={12}
                                className="font-mono text-sm"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={handleSaveMessage}
                                  disabled={loading}
                                >
                                  {loading ? 'Saving...' : 'Save'}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingVendorId(null)
                                    setEditedMessage('')
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <pre className="whitespace-pre-wrap text-sm bg-muted p-3 rounded-md font-mono">
                                {vendor.custom_message || 'No message generated yet. Click "Regenerate" to create one.'}
                              </pre>
                              {vendor.custom_message && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingVendorId(vendor.id)
                                    setEditedMessage(vendor.custom_message || '')
                                  }}
                                >
                                  Edit
                                </Button>
                              )}
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )
      })}

      {/* Preview Dialog */}
      <Dialog open={!!previewVendor} onOpenChange={() => setPreviewVendor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>
              Preview of the outreach email to {previewVendor?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-medium">To:</span> {previewVendor?.contact_email}
              </div>
              <div className="text-sm">
                <span className="font-medium">Subject:</span> Inquiry: {eventName} - Event Venue Request
              </div>
            </div>
            <div className="border rounded-md p-4 bg-muted/50">
              <pre className="whitespace-pre-wrap text-sm font-mono">
                {previewVendor?.custom_message || 'No message generated'}
              </pre>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewVendor(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (previewVendor) {
                  handleApproveSingle(previewVendor.id)
                  setPreviewVendor(null)
                }
              }}
              disabled={loading}
            >
              Approve & Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
