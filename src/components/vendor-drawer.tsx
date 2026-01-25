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
import { LocationPicker, LocationData, MapboxMap } from './mapbox'
import { VendorWithThread, MessageWithParsed } from '@/types/database'
import { escalateThread } from '@/app/actions/threads'
import { updateVendorLocation, regenerateVendorMessage, updateVendorMessage } from '@/app/actions/vendors'
import { normalizeJoinResult } from '@/lib/utils'

interface VendorDrawerProps {
  vendor: VendorWithThread | null
  messages: MessageWithParsed[]
  onClose: () => void
}

export function VendorDrawer({ vendor, messages, onClose }: VendorDrawerProps) {
  const [escalationMessage, setEscalationMessage] = useState('')
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

  const handleEscalate = async () => {
    if (!thread || !escalationMessage.trim()) return

    setLoading(true)
    try {
      await escalateThread(thread.id, escalationMessage)
      setEscalationMessage('')
      onClose()
    } catch (error) {
      console.error('Failed to escalate:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={!!vendor} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0 flex flex-col gap-0 focus:outline-none" showCloseButton={false}>
        {/* Sticky Header */}
        <DialogHeader className="sticky top-0 bg-background z-10 px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center justify-between gap-4">
            <span>{vendor.name}</span>
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
              <DialogClose className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none">
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>
          </DialogTitle>
          <DialogDescription>
            {vendor.category} • {vendor.contact_email}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            {/* Escalation Banner */}
            {isEscalation && thread?.escalation_reason && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-4">
                <h3 className="font-semibold text-destructive">
                  Action Required
                </h3>
                <p className="mt-1 text-sm text-destructive/80">
                  {thread.escalation_reason}
                </p>
              </div>
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

            {/* Escalation Prompt */}
            {isEscalation && (
              <div className="space-y-4 rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold">Send Response & Resume Automation</h3>
                <Textarea
                  placeholder="Type your response to the vendor..."
                  value={escalationMessage}
                  onChange={(e) => setEscalationMessage(e.target.value)}
                  rows={4}
                />
                <Button
                  onClick={handleEscalate}
                  disabled={loading || !escalationMessage.trim()}
                  className="w-full"
                >
                  {loading ? 'Sending...' : 'Send & Resume Automation'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
