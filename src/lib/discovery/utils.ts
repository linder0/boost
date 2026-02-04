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
 * Extract neighborhood from a formatted address
 * Usually the second part of a comma-separated address
 */
export function extractNeighborhood(address: string): string | undefined {
  const parts = address.split(',').map((p) => p.trim())
  if (parts.length >= 3) {
    return parts[1] // Usually neighborhood is second part
  }
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
// Email Utilities
// ============================================================================

/**
 * Generate a placeholder email for venues where we couldn't find a real one
 * Used when Hunter.io doesn't return a result
 */
export function generatePlaceholderEmail(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 20)
  return `events@${slug}.com`
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
