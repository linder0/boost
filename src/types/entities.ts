/**
 * Entity Types for Dinner Series Dashboard
 * Universal entity system with tag-based categorization
 */

import { Entity, EntityMetadata } from './database'

// Simple status type for vendor workflow
export type EntityStatus = 'shortlisted' | 'contacted' | 'confirmed' | 'booked' | 'declined'

// Guest RSVP status
export type GuestRsvpStatus = 'invited' | 'confirmed' | 'declined' | 'maybe'

// ============================================================================
// Tag Constants
// ============================================================================

/**
 * Dinner series entity tags
 */
export const ENTITY_TAGS = {
  // Vendor categories
  CATERER: 'caterer',
  FLORIST: 'florist',
  DECOR: 'decor',
  PRINTER: 'printer',
  STAFF: 'staff',
  VIDEOGRAPHER: 'videographer',
  PHOTOGRAPHER: 'photographer',
  AV: 'av',

  // People
  GUEST: 'guest',
  HOST: 'host',
  SPEAKER: 'speaker',

  // Legacy
  VENDOR: 'vendor',
  RESTAURANT: 'restaurant',
} as const

export type EntityTag = typeof ENTITY_TAGS[keyof typeof ENTITY_TAGS] | string

/**
 * Category groupings for tabs
 */
export const TAB_CATEGORIES = {
  chef: [ENTITY_TAGS.CATERER, ENTITY_TAGS.RESTAURANT],
  decor: [ENTITY_TAGS.FLORIST, ENTITY_TAGS.DECOR, ENTITY_TAGS.PRINTER],
  production: [ENTITY_TAGS.STAFF, ENTITY_TAGS.VIDEOGRAPHER, ENTITY_TAGS.PHOTOGRAPHER, ENTITY_TAGS.AV],
  guests: [ENTITY_TAGS.GUEST, ENTITY_TAGS.SPEAKER],
} as const

export type TabCategory = keyof typeof TAB_CATEGORIES

// ============================================================================
// Display Entity
// ============================================================================

/**
 * Entity formatted for display in tables/lists
 */
export interface DisplayEntity {
  id?: string
  name: string
  tags: string[]

  // Location
  address?: string
  neighborhood?: string
  city?: string
  latitude?: number
  longitude?: number
  location?: string

  description?: string
  website?: string

  // Contact
  email?: string
  phone?: string

  // Event-specific (when linked)
  status?: EntityStatus
  notes?: string

  // Guest-specific
  company?: string
  title?: string
  dietary?: string
  rsvpStatus?: GuestRsvpStatus
}

// ============================================================================
// Conversion Utilities
// ============================================================================

/**
 * Convert database Entity to DisplayEntity
 */
export function toDisplayEntity(entity: Entity & { event_entity?: { status: string; notes?: string } }): DisplayEntity {
  const m = entity.metadata || {}

  return {
    id: entity.id,
    name: entity.name,
    tags: entity.tags || [],

    address: entity.address || undefined,
    neighborhood: entity.neighborhood || undefined,
    city: entity.city || undefined,
    latitude: entity.latitude || undefined,
    longitude: entity.longitude || undefined,
    location: entity.location || undefined,

    description: entity.description || undefined,
    website: entity.website || undefined,

    email: m.email,
    phone: m.phone,

    // Event-specific
    status: entity.event_entity?.status as EntityStatus | undefined,
    notes: entity.event_entity?.notes || undefined,

    // Guest-specific from metadata
    company: m.company as string | undefined,
    title: m.title as string | undefined,
    dietary: m.dietary as string | undefined,
    rsvpStatus: m.rsvp_status as GuestRsvpStatus | undefined,
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
 * Check if entity belongs to a tab category
 */
export function belongsToTab(entity: DisplayEntity | Entity, tab: TabCategory): boolean {
  const categoryTags = TAB_CATEGORIES[tab]
  const entityTags = 'tags' in entity ? entity.tags : []
  return entityTags.some(t => (categoryTags as readonly string[]).includes(t))
}
