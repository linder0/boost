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
import { Entity } from '@/types/database'
import { updateEntity } from '@/app/actions/entities'
import { VendorNameDisplay, VendorEmailDisplay } from './vendor-display'
import { formatPriceLevel, formatSource } from '@/lib/formatting'

interface VendorDrawerProps {
  vendor: Entity | null
  onClose: () => void
}

export function VendorDrawer({ vendor, onClose }: VendorDrawerProps) {
  const [editingLocation, setEditingLocation] = useState(false)
  const [locationSaving, setLocationSaving] = useState(false)
  const [vendorLocation, setVendorLocation] = useState<LocationData | null>(null)
  const [editingDescription, setEditingDescription] = useState(false)
  const [description, setDescription] = useState('')
  const [descriptionSaving, setDescriptionSaving] = useState(false)

  if (!vendor) return null

  const metadata = vendor.metadata || {}

  // Get location from entity columns
  const currentLocation: LocationData | null =
    (vendor.latitude != null && vendor.longitude != null)
      ? { address: vendor.address || vendor.location || '', lat: vendor.latitude, lng: vendor.longitude }
      : null

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
                email={metadata.email || ''}
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
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">About</h3>
                {!editingDescription && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDescription(vendor.description || '')
                      setEditingDescription(true)
                    }}
                  >
                    {vendor.description ? 'Edit' : 'Add Description'}
                  </Button>
                )}
              </div>

              {editingDescription ? (
                <div className="space-y-3">
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Add a description about this venue..."
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={async () => {
                        setDescriptionSaving(true)
                        try {
                          await updateEntity(vendor.id, {
                            description: description || undefined,
                          })
                          setEditingDescription(false)
                        } catch (error) {
                          console.error('Failed to save description:', error)
                        } finally {
                          setDescriptionSaving(false)
                        }
                      }}
                      disabled={descriptionSaving}
                    >
                      {descriptionSaving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingDescription(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : vendor.description ? (
                <p className="text-sm text-muted-foreground">{vendor.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No description added</p>
              )}
            </div>

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
                    <span className="text-muted-foreground">{formatSource(metadata.discovery_source)}</span>
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
                    <span className="text-muted-foreground">{formatPriceLevel(metadata.price_level)}</span>
                  </div>
                )}
                {vendor.popularity && (
                  <div>
                    <span className="font-medium">Popularity:</span>{' '}
                    <span className="text-muted-foreground">{vendor.popularity.toFixed(1)}</span>
                  </div>
                )}
                {vendor.neighborhood && (
                  <div>
                    <span className="font-medium">Neighborhood:</span>{' '}
                    <span className="text-muted-foreground">{vendor.neighborhood}</span>
                  </div>
                )}
                {vendor.city && (
                  <div>
                    <span className="font-medium">City:</span>{' '}
                    <span className="text-muted-foreground">{vendor.city}</span>
                  </div>
                )}
                {vendor.address && (
                  <div className="col-span-2">
                    <span className="font-medium">Address:</span>{' '}
                    <span className="text-muted-foreground">{vendor.address}</span>
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
