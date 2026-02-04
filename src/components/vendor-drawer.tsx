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
import { LocationPicker, LocationData, MapboxMap } from './mapbox'
import { EntityWithStatus } from '@/types/database'
import { updateEntity } from '@/app/actions/entities'
import { VendorNameDisplay, VendorEmailDisplay } from './vendor-display'

interface VendorDrawerProps {
  vendor: EntityWithStatus | null
  onClose: () => void
}

export function VendorDrawer({ vendor, onClose }: VendorDrawerProps) {
  const [loading, setLoading] = useState(false)
  const [editingLocation, setEditingLocation] = useState(false)
  const [locationSaving, setLocationSaving] = useState(false)
  const [vendorLocation, setVendorLocation] = useState<LocationData | null>(null)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState('')
  const [notesSaving, setNotesSaving] = useState(false)

  if (!vendor) return null

  const status = vendor.event_entity?.status
  const metadata = vendor.metadata || {}

  // Get location from metadata
  const currentLocation: LocationData | null =
    metadata.latitude && metadata.longitude
      ? { address: vendor.location || '', lat: metadata.latitude, lng: metadata.longitude }
      : null

  // Status badge variant
  const statusVariant =
    status === 'confirmed' ? 'default' :
    status === 'rejected' ? 'destructive' :
    status === 'contacted' || status === 'responded' ? 'secondary' :
    'outline'

  const statusLabel =
    status === 'discovered' ? 'Not Contacted' :
    status === 'contacted' ? 'Waiting' :
    status === 'responded' ? 'Responded' :
    status === 'confirmed' ? 'Confirmed' :
    status === 'rejected' ? 'Rejected' :
    status || 'Unknown'

  return (
    <Dialog open={!!vendor} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0 flex flex-col gap-0 focus:outline-none" showCloseButton={false}>
        {/* Sticky Header */}
        <DialogHeader className="sticky top-0 bg-background z-10 px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center justify-between gap-4">
            <VendorNameDisplay
              name={vendor.name}
              rating={metadata.rating}
              website={vendor.website}
              discoverySource={metadata.discovery_source}
              showDiscoveryBadge
            />
            <div className="flex items-center gap-3">
              {status && (
                <Badge variant={statusVariant}>
                  {statusLabel}
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
              {metadata.cuisine && (
                <>
                  <span className="font-medium">{metadata.cuisine}</span>
                  <span>•</span>
                </>
              )}
              <VendorEmailDisplay
                email={metadata.email}
                emailConfidence={metadata.email_confidence}
              />
              {metadata.phone && (
                <>
                  <span>•</span>
                  <a href={`tel:${metadata.phone}`} className="hover:underline">
                    {metadata.phone}
                  </a>
                </>
              )}
              {metadata.has_private_dining && (
                <>
                  <span>•</span>
                  <Badge variant="outline" className="text-xs">
                    Private Dining
                    {metadata.private_dining_capacity_min && metadata.private_dining_capacity_max && (
                      <span className="ml-1">({metadata.private_dining_capacity_min}-{metadata.private_dining_capacity_max})</span>
                    )}
                  </Badge>
                </>
              )}
              {metadata.private_dining_minimum && (
                <>
                  <span>•</span>
                  <span>Min: ${metadata.private_dining_minimum.toLocaleString()}</span>
                </>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            {/* Description Section */}
            {vendor.description && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">About</h3>
                <p className="text-sm text-muted-foreground">{vendor.description}</p>
              </div>
            )}

            {/* Tags Section */}
            {vendor.tags && vendor.tags.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {vendor.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Notes Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Notes</h3>
                {!editingNotes && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setNotes(vendor.event_entity?.notes || '')
                      setEditingNotes(true)
                    }}
                  >
                    {vendor.event_entity?.notes ? 'Edit' : 'Add Notes'}
                  </Button>
                )}
              </div>

              {editingNotes ? (
                <div className="space-y-3">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    placeholder="Add notes about this venue..."
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={async () => {
                        setNotesSaving(true)
                        try {
                          // Notes are stored in event_entity, not the entity itself
                          // For now, just close the editor
                          setEditingNotes(false)
                        } catch (error) {
                          console.error('Failed to save notes:', error)
                        } finally {
                          setNotesSaving(false)
                        }
                      }}
                      disabled={notesSaving}
                    >
                      {notesSaving ? 'Saving...' : 'Save Notes'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingNotes(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : vendor.event_entity?.notes ? (
                <div className="rounded-md bg-muted p-4">
                  <p className="text-sm whitespace-pre-wrap">{vendor.event_entity.notes}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No notes added</p>
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
                          await updateEntity(vendor.id, {
                            location: vendorLocation?.address || undefined,
                            metadata: {
                              ...metadata,
                              latitude: vendorLocation?.lat,
                              longitude: vendorLocation?.lng,
                            },
                          })
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

            {/* Metadata Section */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {metadata.discovery_source && (
                  <div>
                    <span className="font-medium">Source:</span>{' '}
                    <span className="text-muted-foreground">{metadata.discovery_source}</span>
                  </div>
                )}
                {metadata.rating && (
                  <div>
                    <span className="font-medium">Rating:</span>{' '}
                    <span className="text-muted-foreground">{metadata.rating.toFixed(1)}</span>
                  </div>
                )}
                {metadata.review_count && (
                  <div>
                    <span className="font-medium">Reviews:</span>{' '}
                    <span className="text-muted-foreground">{metadata.review_count.toLocaleString()}</span>
                  </div>
                )}
                {metadata.price_level && (
                  <div>
                    <span className="font-medium">Price:</span>{' '}
                    <span className="text-muted-foreground">{'$'.repeat(metadata.price_level)}</span>
                  </div>
                )}
                {vendor.popularity && (
                  <div>
                    <span className="font-medium">Popularity:</span>{' '}
                    <span className="text-muted-foreground">{vendor.popularity.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
