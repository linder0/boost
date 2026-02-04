/**
 * Discovery Utilities
 * Shared functions for venue/vendor discovery
 * Single source of truth - used by both /api/discover and /lib/discovery
 */

// ============================================================================
// Types
// ============================================================================

export interface PriceRange {
  min: number
  max: number
}

// ============================================================================
// Price Level Utilities
// ============================================================================

/**
 * Estimate price per person range based on Google Places price level
 * Price level: 0-4 (free to very expensive)
 */
export function estimatePriceRange(priceLevel?: number): PriceRange {
  switch (priceLevel) {
    case 0:
    case 1:
      return { min: 30, max: 60 }
    case 2:
      return { min: 60, max: 100 }
    case 3:
      return { min: 100, max: 175 }
    case 4:
      return { min: 150, max: 250 }
    default:
      return { min: 75, max: 150 }
  }
}

/**
 * Map Google Places price level string to numeric value
 */
export function mapPriceLevel(priceLevel?: string): number | undefined {
  const mapping: Record<string, number> = {
    'PRICE_LEVEL_FREE': 0,
    'PRICE_LEVEL_INEXPENSIVE': 1,
    'PRICE_LEVEL_MODERATE': 2,
    'PRICE_LEVEL_EXPENSIVE': 3,
    'PRICE_LEVEL_VERY_EXPENSIVE': 4,
  }
  return priceLevel ? mapping[priceLevel] : undefined
}

// ============================================================================
// Address Utilities
// ============================================================================

/**
 * Known NYC neighborhoods for matching
 */
const NYC_NEIGHBORHOODS = [
  'Tribeca', 'TriBeCa', 'SoHo', 'NoHo', 'NoLita', 'Nolita',
  'Chelsea', 'Flatiron', 'Gramercy', 'Murray Hill',
  'Midtown', 'Hell\'s Kitchen', 'Times Square', 'Theater District',
  'Upper East Side', 'Upper West Side', 'UES', 'UWS',
  'East Village', 'West Village', 'Greenwich Village',
  'Lower East Side', 'LES', 'Chinatown', 'Little Italy',
  'Financial District', 'FiDi', 'Battery Park', 'Seaport',
  'Meatpacking', 'Meatpacking District', 'Hudson Yards',
  'Harlem', 'East Harlem', 'Washington Heights', 'Inwood',
  'Williamsburg', 'DUMBO', 'Brooklyn Heights', 'Park Slope',
  'Greenpoint', 'Bushwick', 'Bed-Stuy', 'Crown Heights',
  'Cobble Hill', 'Carroll Gardens', 'Boerum Hill', 'Fort Greene',
  'Prospect Heights', 'Clinton Hill', 'Red Hook', 'Gowanus',
  'Astoria', 'Long Island City', 'LIC', 'Jackson Heights',
  'Flushing', 'Forest Hills', 'Sunnyside',
]

/**
 * Extract neighborhood from a formatted address
 * Looks for known NYC neighborhoods in the address string
 */
export function extractNeighborhood(address: string): string | undefined {
  if (!address) return undefined

  const addressLower = address.toLowerCase()

  // Check for known NYC neighborhoods
  for (const neighborhood of NYC_NEIGHBORHOODS) {
    if (addressLower.includes(neighborhood.toLowerCase())) {
      return neighborhood
    }
  }

  // Google Places addresses don't typically include neighborhoods
  // Return undefined rather than guessing
  return undefined
}

/**
 * NYC Borough mapping
 */
const NYC_BOROUGHS = ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island']

/**
 * Extract borough from an NYC address
 * Looks for borough names in the address string
 */
export function extractBorough(address: string): string | undefined {
  const addressLower = address.toLowerCase()

  // Check for borough in address
  for (const borough of NYC_BOROUGHS) {
    if (addressLower.includes(borough.toLowerCase())) {
      return borough
    }
  }

  // Check for common abbreviations and variations
  if (addressLower.includes('ny ') || addressLower.includes('new york')) {
    // If it says "New York, NY" without a borough, assume Manhattan
    if (!addressLower.includes('brooklyn') &&
        !addressLower.includes('queens') &&
        !addressLower.includes('bronx') &&
        !addressLower.includes('staten')) {
      return 'Manhattan'
    }
  }

  return undefined
}

/**
 * Extract the street address (first line) from a full formatted address
 */
export function extractStreetAddress(address: string): string {
  const parts = address.split(',').map((p) => p.trim())
  return parts[0] || address
}

// ============================================================================
// Name Utilities
// ============================================================================

/**
 * Normalize a name for deduplication purposes
 * Removes special characters and limits length
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 30)
}

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default capacity range for venues
 */
export const DEFAULT_CAPACITY = {
  min: 20,
  max: 150,
}

/**
 * Default venue types for discovery
 */
export const DEFAULT_VENUE_TYPES = ['restaurant', 'bar', 'rooftop']

/**
 * Default vendor types for discovery
 */
export const DEFAULT_VENDOR_TYPES = ['caterer', 'photographer']

// ============================================================================
// Entity Conversion
// ============================================================================

import type { DiscoveredEntityInput } from '@/app/actions/entities'

/**
 * Convert discovered restaurant (from API) to entity input format
 */
export function discoveredRestaurantToEntity(restaurant: {
  name: string
  email?: string
  category?: string
  city?: string
  neighborhood?: string
  address?: string
  cuisine?: string
  priceLevel?: number
  latitude?: number
  longitude?: number
  discoverySource?: string
  googlePlaceId?: string
  rating?: number
  emailConfidence?: number
  hasPrivateDining?: boolean
  privateDiningCapacityMin?: number
  privateDiningCapacityMax?: number
  privateDiningMinimum?: number
  resyVenueId?: string
  opentableId?: string
  beliRank?: number
  website?: string
  phone?: string
}): DiscoveredEntityInput {
  const tags = ['restaurant']
  if (restaurant.cuisine) tags.push(restaurant.cuisine.toLowerCase())
  if (restaurant.hasPrivateDining) tags.push('private_dining')

  return {
    name: restaurant.name,
    tags,
    // Granular location fields
    address: restaurant.address,
    neighborhood: restaurant.neighborhood,
    city: restaurant.city,
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
    // Contact
    website: restaurant.website,
    email: restaurant.email,
    phone: restaurant.phone,
    // Discovery
    discoverySource: restaurant.discoverySource as DiscoveredEntityInput['discoverySource'],
    googlePlaceId: restaurant.googlePlaceId,
    rating: restaurant.rating,
    emailConfidence: restaurant.emailConfidence,
    // Restaurant-specific
    cuisine: restaurant.cuisine,
    priceLevel: restaurant.priceLevel,
    hasPrivateDining: restaurant.hasPrivateDining,
    privateDiningCapacityMin: restaurant.privateDiningCapacityMin,
    privateDiningCapacityMax: restaurant.privateDiningCapacityMax,
    privateDiningMinimum: restaurant.privateDiningMinimum,
    resyVenueId: restaurant.resyVenueId,
    opentableId: restaurant.opentableId,
    beliRank: restaurant.beliRank,
  }
}
