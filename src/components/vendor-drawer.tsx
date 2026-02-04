'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { X } from 'lucide-react'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion'
import { MessageTimeline } from './message-timeline'
import { ParsedFactsCard } from './parsed-facts-card'
import { EscalationContextPanel } from './escalation-context-panel'
import { LocationPicker, LocationData, MapboxMap } from './mapbox'
import { VendorWithThread, MessageWithParsed } from '@/types/database'
import { escalateThread, updateThreadStatus } from '@/app/actions/threads'
import { updateVendorLocation, regenerateVendorMessage, updateVendorMessage } from '@/app/actions/vendors'
import { normalizeJoinResult } from '@/lib/utils'
import { VendorNameDisplay, VendorEmailDisplay } from './vendor-display'

interface VendorDrawerProps {
  vendor: VendorWithThread | null
  messages: MessageWithParsed[]
  onClose: () => void
}

export function VendorDrawer({ vendor, messages, onClose }: VendorDrawerProps) {
  const [loading, setLoading] = useState(false)
  const [editingLocation, setEditingLocation] = useState(false)
  const [locationSaving, setLocationSaving] = useState(false)
  const [vendorLocation, setVendorLocation] = useState<LocationData | null>(null)
  const [editingMessage, setEditingMessage] = useState(false)
  const [customMessage, setCustomMessage] = useState('')
  const [messageSaving, setMessageSaving] = useState(false)
  const [messageRegenerating, setMessageRegenerating] = useState(false)

  if (!vendor) return null

  const thread = normalizeJoinResult(vendor.vendor_threads)

  // Initialize vendor location from vendor data
  const currentLocation: LocationData | null =
    vendor.latitude && vendor.longitude
      ? { address: vendor.address || '', lat: vendor.latitude, lng: vendor.longitude }
      : null

  const isEscalation = thread?.status === 'ESCALATION'

  // Get the most recent parsed response
  const latestParsedMessage = messages
    .filter((m) => m.parsed_responses)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]

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
              discoverySource={vendor.discovery_source}
              showDiscoveryBadge
            />
            <div className="flex items-center gap-3">
              {thread && (
                <Badge
                  variant={
                    thread.status === 'VIABLE'
                      ? 'default'
                      : thread.status === 'ESCALATION'
                      ? 'destructive'
                      : 'secondary'
                  }
                >
                  {thread.status}
                </Badge>
              )}
              <DialogClose className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none cursor-pointer">
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>
          </DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {vendor.cuisine && (
                <>
                  <span className="font-medium">{vendor.cuisine}</span>
                  <span>•</span>
                </>
              )}
              <VendorEmailDisplay
                email={vendor.contact_email}
                emailConfidence={vendor.email_confidence}
              />
              {vendor.phone && (
                <>
                  <span>•</span>
                  <a href={`tel:${vendor.phone}`} className="hover:underline">
                    {vendor.phone}
                  </a>
                </>
              )}
              {vendor.has_private_dining && (
                <>
                  <span>•</span>
                  <Badge variant="outline" className="text-xs">
                    Private Dining
                    {vendor.private_dining_capacity_min && vendor.private_dining_capacity_max && (
                      <span className="ml-1">({vendor.private_dining_capacity_min}-{vendor.private_dining_capacity_max})</span>
                    )}
                  </Badge>
                </>
              )}
              {vendor.private_dining_minimum && (
                <>
                  <span>•</span>
                  <span>Min: ${vendor.private_dining_minimum.toLocaleString()}</span>
                </>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            {/* Escalation Context Panel - Enhanced Human-in-the-Loop */}
            {isEscalation && thread && (
              <EscalationContextPanel
                thread={thread}
                parsedResponse={latestParsedMessage?.parsed_responses}
                vendorName={vendor.name}
                onSendResponse={async (message) => {
                  setLoading(true)
                  try {
                    await escalateThread(thread.id, message)
                    onClose()
                  } catch (error) {
                    console.error('Failed to send response:', error)
                  } finally {
                    setLoading(false)
                  }
                }}
                onApprove={async () => {
                  setLoading(true)
                  try {
                    await updateThreadStatus(thread.id, 'VIABLE')
                    onClose()
                  } catch (error) {
                    console.error('Failed to approve:', error)
                  } finally {
                    setLoading(false)
                  }
                }}
                onReject={async () => {
                  setLoading(true)
                  try {
                    await updateThreadStatus(thread.id, 'REJECTED')
                    onClose()
                  } catch (error) {
                    console.error('Failed to reject:', error)
                  } finally {
                    setLoading(false)
                  }
                }}
                loading={loading}
              />
            )}

            {/* Outreach Message Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Outreach Message</h3>
                <div className="flex gap-2">
                  {!editingMessage && vendor.custom_message && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCustomMessage(vendor.custom_message || '')
                        setEditingMessage(true)
                      }}
                    >
                      Edit
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setMessageRegenerating(true)
                      try {
                        const newMessage = await regenerateVendorMessage(vendor.id)
                        setCustomMessage(newMessage)
                        if (editingMessage) {
                          // Update the textarea if editing
                        }
                      } catch (error) {
                        console.error('Failed to regenerate message:', error)
                      } finally {
                        setMessageRegenerating(false)
                      }
                    }}
                    disabled={messageRegenerating}
                  >
                    {messageRegenerating ? 'Generating...' : 'Regenerate'}
                  </Button>
                </div>
              </div>

              {editingMessage ? (
                <div className="space-y-3">
                  <Textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    rows={10}
                    placeholder="Enter your outreach message..."
                    className="font-mono text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={async () => {
                        setMessageSaving(true)
                        try {
                          await updateVendorMessage(vendor.id, customMessage)
                          setEditingMessage(false)
                        } catch (error) {
                          console.error('Failed to save message:', error)
                        } finally {
                          setMessageSaving(false)
                        }
                      }}
                      disabled={messageSaving}
                    >
                      {messageSaving ? 'Saving...' : 'Save Message'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingMessage(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : vendor.custom_message ? (
                <div className="rounded-md bg-muted p-4">
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {vendor.custom_message}
                  </pre>
                </div>
              ) : (
                <div className="rounded-md border border-dashed p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    No outreach message generated yet
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      setMessageRegenerating(true)
                      try {
                        await regenerateVendorMessage(vendor.id)
                      } catch (error) {
                        console.error('Failed to generate message:', error)
                      } finally {
                        setMessageRegenerating(false)
                      }
                    }}
                    disabled={messageRegenerating}
                  >
                    {messageRegenerating ? 'Generating...' : 'Generate Message'}
                  </Button>
                </div>
              )}
            </div>

            {/* Location Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Location</h3>
                {!editingLocation && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setVendorLocation(currentLocation)
                      setEditingLocation(true)
                    }}
                  >
                    {currentLocation ? 'Edit' : 'Add Location'}
                  </Button>
                )}
              </div>

              {editingLocation ? (
                <div className="space-y-3">
                  <LocationPicker
                    value={vendorLocation}
                    onChange={setVendorLocation}
                    label=""
                    placeholder="Search for venue address..."
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={async () => {
                        setLocationSaving(true)
                        try {
                          await updateVendorLocation(
                            vendor.id,
                            vendorLocation
                              ? {
                                  address: vendorLocation.address,
                                  latitude: vendorLocation.lat,
                                  longitude: vendorLocation.lng,
                                }
                              : null
                          )
                          setEditingLocation(false)
                        } catch (error) {
                          console.error('Failed to save location:', error)
                        } finally {
                          setLocationSaving(false)
                        }
                      }}
                      disabled={locationSaving}
                    >
                      {locationSaving ? 'Saving...' : 'Save Location'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingLocation(false)}
                    >
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

            {/* Note: Escalation prompt is now integrated into EscalationContextPanel above */}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
