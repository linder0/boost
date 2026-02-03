/**
 * Unified Entity Types
 * Clean type hierarchy for venues and vendors
 * Single source of truth for entity-related types
 */

import { EntityCategory, EntityType } from '@/lib/entities'

// ============================================================================
// Base Entity Types
// ============================================================================

/**
 * Catering configuration for venues
 */
export interface CateringOptions {
  food: boolean
  drinks: boolean
  externalAllowed: boolean
}

/**
 * Discovery source for entities
 */
export type DiscoverySource = 'google_places' | 'manual' | 'csv' | 'demo'

/**
 * Indoor/outdoor configuration
 */
export type IndoorOutdoorType = 'indoor' | 'outdoor' | 'both'

/**
 * Base entity interface with common fields shared by all entity types
 */
export interface BaseEntity {
  name: string
  category: EntityCategory
  contactEmail: string
  address?: string
  latitude?: number
  longitude?: number
  discoverySource?: DiscoverySource
  website?: string
  phone?: string
  rating?: number
  googlePlaceId?: string
  emailConfidence?: number
}

// ============================================================================
// Venue Entity
// ============================================================================

/**
 * Venue-specific fields extending base entity
 */
export interface VenueEntity extends BaseEntity {
  entityType: 'venue'
  city: string
  neighborhood?: string
  venueTypes: string[]
  capacityMin: number
  capacityMax: number
  pricePerPersonMin: number
  pricePerPersonMax: number
  indoorOutdoor: IndoorOutdoorType
  catering: CateringOptions
}

// ============================================================================
// Vendor Entity
// ============================================================================

/**
 * Vendor-specific fields extending base entity
 */
export interface VendorEntity extends BaseEntity {
  entityType: 'vendor'
  serviceArea?: string[]
  minimumSpend?: number
  city?: string
}

// ============================================================================
// Union Types
// ============================================================================

/**
 * Discovered entity - can be either venue or vendor
 */
export type DiscoveredEntity = VenueEntity | VendorEntity

/**
 * Entity for display in tables/lists (unified view)
 */
export interface DisplayEntity {
  id?: string
  name: string
  category: EntityCategory
  contactEmail: string
  address?: string
  city?: string
  neighborhood?: string
  latitude?: number
  longitude?: number
  discoverySource?: DiscoverySource
  website?: string
  rating?: number
  emailConfidence?: number
  pricePerPersonMin?: number
  pricePerPersonMax?: number
  capacityMin?: number
  capacityMax?: number
  entityType?: EntityType
  // Status fields (when linked to database)
  status?: string
  isAlreadyAdded?: boolean
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if an entity is a venue
 */
export function isVenueEntity(entity: DiscoveredEntity): entity is VenueEntity {
  return entity.entityType === 'venue'
}

/**
 * Check if an entity is a vendor
 */
export function isVendorEntity(entity: DiscoveredEntity): entity is VendorEntity {
  return entity.entityType === 'vendor'
}

/**
 * Check if an entity has discovery metadata
 */
export function hasDiscoveryMetadata(entity: BaseEntity): boolean {
  return entity.discoverySource !== undefined && entity.googlePlaceId !== undefined
}

// ============================================================================
// Conversion Utilities
// ============================================================================

/**
 * Convert entity to database vendor format
 */
export function entityToVendor(entity: DisplayEntity): {
  name: string
  category: string
  contact_email: string
  address?: string
  latitude?: number
  longitude?: number
} {
  return {
    name: entity.name,
    category: entity.category,
    contact_email: entity.contactEmail,
    address: entity.neighborhood 
      ? `${entity.neighborhood}, ${entity.city || ''}`.trim()
      : entity.city || entity.address,
    latitude: entity.latitude,
    longitude: entity.longitude,
  }
}

/**
 * Convert discovered venue to display entity format
 * Compatible with both new DiscoveredEntity and legacy DemoVenue/DiscoveredVenue types
 */
export function toDisplayEntity(venue: {
  name: string
  category: string
  email?: string
  contactEmail?: string
  city?: string
  neighborhood?: string
  latitude?: number
  longitude?: number
  discoverySource?: string
  website?: string
  rating?: number
  emailConfidence?: number
  pricePerPersonMin?: number
  pricePerPersonMax?: number
  capacityMin?: number
  capacityMax?: number
  googlePlaceId?: string
}): DisplayEntity {
  return {
    name: venue.name,
    category: venue.category as EntityCategory,
    contactEmail: venue.contactEmail || venue.email || '',
    address: venue.neighborhood 
      ? `${venue.neighborhood}, ${venue.city || ''}`
      : venue.city,
    city: venue.city,
    neighborhood: venue.neighborhood,
    latitude: venue.latitude,
    longitude: venue.longitude,
    discoverySource: venue.discoverySource as DiscoverySource,
    website: venue.website,
    rating: venue.rating,
    emailConfidence: venue.emailConfidence,
    pricePerPersonMin: venue.pricePerPersonMin,
    pricePerPersonMax: venue.pricePerPersonMax,
    capacityMin: venue.capacityMin,
    capacityMax: venue.capacityMax,
    entityType: venue.category === 'Venue' ? 'venue' : 'vendor',
  }
}
