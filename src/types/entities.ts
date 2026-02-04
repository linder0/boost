/**
 * Unified Entity Types
 * VROOM Select: Restaurant-focused type definitions
 */

import { EntityCategory, CuisineType, NYCNeighborhood } from '@/lib/entities'

// ============================================================================
// Base Types
// ============================================================================

/**
 * Discovery source for restaurants
 */
export type DiscoverySource = 'google_places' | 'resy' | 'opentable' | 'beli' | 'manual' | 'csv' | 'demo'

/**
 * Private dining capacity range
 */
export interface PrivateDiningCapacity {
  min: number
  max: number
}

// ============================================================================
// Restaurant Entity
// ============================================================================

/**
 * Restaurant entity with all discovery and dining information
 */
export interface RestaurantEntity {
  name: string
  category: EntityCategory
  contactEmail: string
  address?: string
  city?: string
  neighborhood?: NYCNeighborhood | string
  latitude?: number
  longitude?: number

  // Discovery metadata
  discoverySource?: DiscoverySource
  website?: string
  phone?: string
  rating?: number
  googlePlaceId?: string
  emailConfidence?: number

  // Restaurant-specific fields
  cuisine?: CuisineType | string
  priceLevel?: number // 1-4 ($-$$$$)

  // Private dining
  hasPrivateDining?: boolean
  privateDiningCapacity?: PrivateDiningCapacity
  privateDiningMinimum?: number // Minimum spend

  // External platform IDs
  resyVenueId?: string
  opentableId?: string
  beliRank?: number
}

/**
 * Entity for display in tables/lists
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
  // Restaurant-specific
  cuisine?: string
  priceLevel?: number
  hasPrivateDining?: boolean
  privateDiningCapacity?: PrivateDiningCapacity
  privateDiningMinimum?: number
  resyVenueId?: string
  opentableId?: string
  beliRank?: number
  // Status fields (when linked to database)
  status?: string
  isAlreadyAdded?: boolean
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if an entity has private dining
 */
export function hasPrivateDining(entity: RestaurantEntity | DisplayEntity): boolean {
  return entity.hasPrivateDining === true ||
    (entity.privateDiningCapacity !== undefined && entity.privateDiningCapacity.max > 0)
}

/**
 * Check if an entity has discovery metadata
 */
export function hasDiscoveryMetadata(entity: RestaurantEntity | DisplayEntity): boolean {
  return entity.discoverySource !== undefined && entity.googlePlaceId !== undefined
}

/**
 * Check if entity is from a specific source
 */
export function isFromSource(entity: RestaurantEntity | DisplayEntity, source: DiscoverySource): boolean {
  return entity.discoverySource === source
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
  cuisine?: string
  has_private_dining?: boolean
  private_dining_capacity_min?: number
  private_dining_capacity_max?: number
  private_dining_minimum?: number
  resy_venue_id?: string
  opentable_id?: string
  beli_rank?: number
} {
  return {
    name: entity.name,
    category: entity.category,
    contact_email: entity.contactEmail,
    address: entity.neighborhood
      ? `${entity.neighborhood}, ${entity.city || 'New York'}`.trim()
      : entity.city || entity.address,
    latitude: entity.latitude,
    longitude: entity.longitude,
    cuisine: entity.cuisine,
    has_private_dining: entity.hasPrivateDining,
    private_dining_capacity_min: entity.privateDiningCapacity?.min,
    private_dining_capacity_max: entity.privateDiningCapacity?.max,
    private_dining_minimum: entity.privateDiningMinimum,
    resy_venue_id: entity.resyVenueId,
    opentable_id: entity.opentableId,
    beli_rank: entity.beliRank,
  }
}

/**
 * Convert discovered restaurant to display entity format
 */
export function toDisplayEntity(restaurant: {
  name: string
  category?: string
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
  cuisine?: string
  priceLevel?: number
  hasPrivateDining?: boolean
  privateDiningCapacity?: PrivateDiningCapacity
  privateDiningMinimum?: number
  resyVenueId?: string
  opentableId?: string
  beliRank?: number
}): DisplayEntity {
  return {
    name: restaurant.name,
    category: (restaurant.category as EntityCategory) || 'Restaurant',
    contactEmail: restaurant.contactEmail || restaurant.email || '',
    address: restaurant.neighborhood
      ? `${restaurant.neighborhood}, ${restaurant.city || 'New York'}`
      : restaurant.city,
    city: restaurant.city || 'New York',
    neighborhood: restaurant.neighborhood,
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
    discoverySource: restaurant.discoverySource as DiscoverySource,
    website: restaurant.website,
    rating: restaurant.rating,
    emailConfidence: restaurant.emailConfidence,
    pricePerPersonMin: restaurant.pricePerPersonMin,
    pricePerPersonMax: restaurant.pricePerPersonMax,
    capacityMin: restaurant.capacityMin,
    capacityMax: restaurant.capacityMax,
    cuisine: restaurant.cuisine,
    priceLevel: restaurant.priceLevel,
    hasPrivateDining: restaurant.hasPrivateDining,
    privateDiningCapacity: restaurant.privateDiningCapacity,
    privateDiningMinimum: restaurant.privateDiningMinimum,
    resyVenueId: restaurant.resyVenueId,
    opentableId: restaurant.opentableId,
    beliRank: restaurant.beliRank,
  }
}
