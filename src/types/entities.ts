/**
 * Entity Types for VRM (Vendor Relationship Manager)
 * Universal entity system with tag-based categorization
 */

import { Entity, EntityMetadata, DiscoverySource, EntityStatus } from './database'

// ============================================================================
// Tag Constants
// ============================================================================

/**
 * Common entity tags
 */
export const ENTITY_TAGS = {
  // Type tags
  VENUE: 'venue',
  RESTAURANT: 'restaurant',
  VENDOR: 'vendor',
  FUNDER: 'funder',
  HOST: 'host',
  PERSON: 'person',

  // Feature tags
  PRIVATE_DINING: 'private_dining',
  CATERING: 'catering',
  BAR: 'bar',
  OUTDOOR: 'outdoor',

  // Status tags
  VERIFIED: 'verified',
  PREMIUM: 'premium',
} as const

export type EntityTag = typeof ENTITY_TAGS[keyof typeof ENTITY_TAGS] | string

// ============================================================================
// Display Entity
// ============================================================================

/**
 * Entity formatted for display in tables/lists
 * Flattens metadata fields for easy access
 */
export interface DisplayEntity {
  id?: string
  name: string
  tags: string[]
  location?: string
  description?: string
  website?: string
  popularity?: number

  // Flattened from metadata for convenience
  email?: string
  phone?: string
  latitude?: number
  longitude?: number
  neighborhood?: string
  city?: string

  // Discovery
  discoverySource?: DiscoverySource
  googlePlaceId?: string
  rating?: number
  reviewCount?: number
  emailConfidence?: number

  // Restaurant-specific
  cuisine?: string
  priceLevel?: number
  hasPrivateDining?: boolean
  privateDiningCapacityMin?: number
  privateDiningCapacityMax?: number
  privateDiningMinimum?: number

  // External IDs
  resyVenueId?: string
  opentableId?: string
  beliRank?: number

  // Event-specific (when linked)
  status?: EntityStatus
  notes?: string
  outreachApproved?: boolean
  isAlreadyAdded?: boolean
}

// ============================================================================
// Conversion Utilities
// ============================================================================

/**
 * Convert database Entity to DisplayEntity
 */
export function toDisplayEntity(entity: Entity & { event_entity?: { status: EntityStatus; notes?: string; outreach_approved?: boolean } }): DisplayEntity {
  const m = entity.metadata || {}

  return {
    id: entity.id,
    name: entity.name,
    tags: entity.tags || [],
    location: entity.location || undefined,
    description: entity.description || undefined,
    website: entity.website || undefined,
    popularity: entity.popularity || undefined,

    // Flatten metadata
    email: m.email,
    phone: m.phone,
    latitude: m.latitude,
    longitude: m.longitude,
    neighborhood: m.neighborhood,
    city: m.city,

    discoverySource: m.discovery_source,
    googlePlaceId: m.google_place_id,
    rating: m.rating,
    reviewCount: m.review_count,
    emailConfidence: m.email_confidence,

    cuisine: m.cuisine,
    priceLevel: m.price_level,
    hasPrivateDining: m.has_private_dining,
    privateDiningCapacityMin: m.private_dining_capacity_min,
    privateDiningCapacityMax: m.private_dining_capacity_max,
    privateDiningMinimum: m.private_dining_minimum,

    resyVenueId: m.resy_venue_id,
    opentableId: m.opentable_id,
    beliRank: m.beli_rank,

    // Event-specific
    status: entity.event_entity?.status,
    notes: entity.event_entity?.notes || undefined,
    outreachApproved: entity.event_entity?.outreach_approved,
  }
}

/**
 * Convert DisplayEntity to database Entity format
 */
export function toEntity(display: DisplayEntity): Omit<Entity, 'id' | 'created_at' | 'updated_at'> {
  const metadata: EntityMetadata = {}

  // Contact
  if (display.email) metadata.email = display.email
  if (display.phone) metadata.phone = display.phone

  // Location
  if (display.latitude) metadata.latitude = display.latitude
  if (display.longitude) metadata.longitude = display.longitude
  if (display.neighborhood) metadata.neighborhood = display.neighborhood
  if (display.city) metadata.city = display.city

  // Discovery
  if (display.discoverySource) metadata.discovery_source = display.discoverySource
  if (display.googlePlaceId) metadata.google_place_id = display.googlePlaceId
  if (display.rating) metadata.rating = display.rating
  if (display.reviewCount) metadata.review_count = display.reviewCount
  if (display.emailConfidence) metadata.email_confidence = display.emailConfidence

  // Restaurant
  if (display.cuisine) metadata.cuisine = display.cuisine
  if (display.priceLevel) metadata.price_level = display.priceLevel
  if (display.hasPrivateDining !== undefined) metadata.has_private_dining = display.hasPrivateDining
  if (display.privateDiningCapacityMin) metadata.private_dining_capacity_min = display.privateDiningCapacityMin
  if (display.privateDiningCapacityMax) metadata.private_dining_capacity_max = display.privateDiningCapacityMax
  if (display.privateDiningMinimum) metadata.private_dining_minimum = display.privateDiningMinimum

  // External IDs
  if (display.resyVenueId) metadata.resy_venue_id = display.resyVenueId
  if (display.opentableId) metadata.opentable_id = display.opentableId
  if (display.beliRank) metadata.beli_rank = display.beliRank

  return {
    name: display.name,
    tags: display.tags,
    location: display.location || null,
    description: display.description || null,
    website: display.website || null,
    popularity: display.popularity || null,
    metadata,
  }
}

/**
 * Calculate popularity score from rating and review count
 */
export function calculatePopularity(rating?: number, reviewCount?: number): number {
  if (!rating) return 0
  const reviews = Math.max(1, reviewCount || 1)
  return rating * Math.log(reviews)
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if entity has a specific tag
 */
export function hasTag(entity: DisplayEntity | Entity, tag: string): boolean {
  const tags = 'tags' in entity ? entity.tags : []
  return tags.includes(tag)
}

/**
 * Check if entity is a restaurant
 */
export function isRestaurant(entity: DisplayEntity | Entity): boolean {
  return hasTag(entity, ENTITY_TAGS.RESTAURANT)
}

/**
 * Check if entity is a venue
 */
export function isVenue(entity: DisplayEntity | Entity): boolean {
  return hasTag(entity, ENTITY_TAGS.VENUE)
}

/**
 * Check if entity has private dining
 */
export function hasPrivateDining(entity: DisplayEntity): boolean {
  return entity.hasPrivateDining === true ||
    (entity.privateDiningCapacityMax !== undefined && entity.privateDiningCapacityMax > 0)
}

// ============================================================================
// Legacy exports (for gradual migration)
// ============================================================================

/** @deprecated Use DisplayEntity instead */
export type RestaurantEntity = DisplayEntity

/** @deprecated Use EntityMetadata instead */
export interface PrivateDiningCapacity {
  min: number
  max: number
}

/** @deprecated Use toEntity instead */
export function entityToVendor(entity: DisplayEntity): Record<string, unknown> {
  return toEntity(entity) as unknown as Record<string, unknown>
}
