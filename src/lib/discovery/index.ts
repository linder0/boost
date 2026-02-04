/**
 * Restaurant Discovery Module
 * VROOM Select: Orchestrates discovery from multiple sources
 * - Google Places API
 * - Resy (unofficial API)
 * - Clawdbot (OpenTable, Beli browser automation)
 * - Hunter.io (email enrichment)
 */

import { searchVenues, GooglePlaceVenue } from './google-places'
import { findEmail, findEmailsBatch, HunterEmailResult } from './hunter'
import { searchResyVenues, resyVenueToDiscovered, ResyVenue } from './resy'
import {
  searchOpenTableVenues,
  openTableVenueToDiscovered,
  getMetroId,
  OpenTableVenue,
} from './opentable'
import {
  discoverOpenTablePrivateDining,
  getBeliRankings,
} from './clawdbot'
import {
  estimatePriceRange,
  extractNeighborhood,
  extractBorough,
  generatePlaceholderEmail,
} from './utils'

// Re-exports for external use
export { searchVenues } from './google-places'
export type { GooglePlaceVenue } from './google-places'
export { findEmail, findEmailsBatch } from './hunter'
export type { HunterEmailResult } from './hunter'
export { searchResyVenues, checkResyAvailability } from './resy'
export type { ResyVenue, ResyAvailability } from './resy'
export {
  searchOpenTableVenues,
  checkOpenTableAvailability,
  getOpenTableReservationUrl,
  getMetroId,
} from './opentable'
export type { OpenTableVenue, OpenTableAvailability } from './opentable'
export {
  discoverOpenTablePrivateDining,
  getBeliRankings,
  discoverContactInfo,
} from './clawdbot'
export type { ClawdbotTask, ClawdbotTaskType } from './clawdbot'
export * from './utils'

// ============================================================================
// Types
// ============================================================================

export type DiscoverySource = 'google_places' | 'resy' | 'opentable' | 'beli' | 'demo'

export interface DiscoveredRestaurant {
  name: string
  category: 'Restaurant'
  email: string
  city: string
  neighborhood?: string
  address?: string // Full street address
  borough?: string // NYC borough: Manhattan, Brooklyn, etc.
  cuisine?: string
  priceLevel?: number
  capacityMin: number
  capacityMax: number
  pricePerPersonMin: number
  pricePerPersonMax: number
  latitude?: number
  longitude?: number
  // Discovery metadata
  googlePlaceId?: string
  resyVenueId?: string
  opentableId?: string
  beliRank?: number
  emailConfidence?: number
  discoverySource: DiscoverySource
  website?: string
  rating?: number
  phone?: string
  // Private dining
  hasPrivateDining?: boolean
  privateDiningCapacityMin?: number
  privateDiningCapacityMax?: number
  privateDiningMinimum?: number
  // Reservation info
  reservationPlatform?: 'resy' | 'opentable' | 'yelp' | 'direct'
  reservationUrl?: string
  hasOnlineReservation?: boolean
}

export interface DiscoveryOptions {
  city?: string
  neighborhood?: string // Single neighborhood (legacy support)
  neighborhoods?: string[] // Multiple neighborhoods
  cuisine?: string
  partySize?: number
  date?: string
  requirePrivateDining?: boolean
  sources?: DiscoverySource[]
  limit?: number
}

// ============================================================================
// Main Discovery Function
// ============================================================================

/**
 * Discover restaurants from multiple sources
 * Merges results and deduplicates by name/address
 * Supports searching across multiple neighborhoods
 */
export async function discoverRestaurants(
  options: DiscoveryOptions = {}
): Promise<DiscoveredRestaurant[]> {
  const {
    city = 'New York',
    neighborhood,
    neighborhoods,
    cuisine,
    partySize = 20,
    sources = ['google_places', 'resy'],
    limit = 30,
  } = options

  // Build list of neighborhoods to search
  // Support both single neighborhood (legacy) and multiple neighborhoods
  const searchNeighborhoods = neighborhoods?.length
    ? neighborhoods
    : neighborhood
      ? [neighborhood]
      : [undefined] // Search without neighborhood filter if none provided

  const allResults: DiscoveredRestaurant[] = []
  const seenNames = new Set<string>()

  // Calculate per-neighborhood limit to stay within total limit
  const perNeighborhoodLimit = Math.ceil(limit / searchNeighborhoods.length)

  // Search each neighborhood
  for (const hood of searchNeighborhoods) {
    // Parallel discovery from enabled sources for this neighborhood
    const discoveryPromises: Promise<DiscoveredRestaurant[]>[] = []

    if (sources.includes('google_places')) {
      discoveryPromises.push(
        discoverFromGooglePlaces(city, hood, cuisine, perNeighborhoodLimit).catch((err) => {
          console.error('Google Places discovery error:', err)
          return []
        })
      )
    }

    if (sources.includes('resy')) {
      discoveryPromises.push(
        discoverFromResy(city, hood, cuisine, perNeighborhoodLimit).catch((err) => {
          console.error('Resy discovery error:', err)
          return []
        })
      )
    }

    if (sources.includes('opentable')) {
      discoveryPromises.push(
        discoverFromOpenTable(city, hood, cuisine, perNeighborhoodLimit).catch((err) => {
          console.error('OpenTable discovery error:', err)
          return []
        })
      )
    }

    if (sources.includes('beli')) {
      // Beli doesn't filter by neighborhood, only run once
      if (hood === searchNeighborhoods[0]) {
        discoveryPromises.push(
          discoverFromBeli(limit).catch((err) => {
            console.error('Beli discovery error:', err)
            return []
          })
        )
      }
    }

    // Wait for all sources for this neighborhood
    const results = await Promise.all(discoveryPromises)

    // Merge and deduplicate
    for (const sourceResults of results) {
      for (const restaurant of sourceResults) {
        const normalizedName = restaurant.name.toLowerCase().trim()
        if (!seenNames.has(normalizedName)) {
          seenNames.add(normalizedName)
          allResults.push(restaurant)
        } else {
          // Merge data from duplicate (e.g., add beliRank from Beli to existing record)
          const existing = allResults.find(
            (r) => r.name.toLowerCase().trim() === normalizedName
          )
          if (existing) {
            mergeRestaurantData(existing, restaurant)
          }
        }
      }
    }
  }

  return allResults.slice(0, limit)
}

// ============================================================================
// Source-Specific Discovery
// ============================================================================

/**
 * Discover from Google Places
 */
async function discoverFromGooglePlaces(
  city: string,
  neighborhood?: string,
  cuisine?: string,
  limit: number = 20
): Promise<DiscoveredRestaurant[]> {
  const searchTypes = cuisine
    ? [cuisine.toLowerCase(), 'restaurant']
    : ['restaurant', 'private_dining']

  const googleVenues = await searchVenues(city, searchTypes, limit, neighborhood)

  if (googleVenues.length === 0) {
    return []
  }

  // Enrich with Hunter emails
  const venuesWithWebsites = googleVenues.filter((v) => v.website)
  const websiteUrls = venuesWithWebsites.map((v) => v.website!)

  let emailResults = new Map<string, HunterEmailResult | null>()
  if (websiteUrls.length > 0) {
    emailResults = await findEmailsBatch(websiteUrls)
  }

  return googleVenues.map((venue) => {
    const emailResult = venue.website ? emailResults.get(venue.website) : null
    const priceRange = estimatePriceRange(venue.priceLevel)
    const email = emailResult?.email || generatePlaceholderEmail(venue.name)

    return {
      name: venue.name,
      category: 'Restaurant' as const,
      email,
      city,
      neighborhood: extractNeighborhood(venue.address),
      address: venue.address,
      borough: extractBorough(venue.address),
      cuisine: cuisine || undefined, // Use the cuisine search term
      priceLevel: venue.priceLevel,
      capacityMin: 20,
      capacityMax: 150,
      pricePerPersonMin: priceRange.min,
      pricePerPersonMax: priceRange.max,
      latitude: venue.latitude,
      longitude: venue.longitude,
      googlePlaceId: venue.googlePlaceId,
      emailConfidence: emailResult?.confidence,
      discoverySource: 'google_places' as const,
      website: venue.website,
      rating: venue.rating,
      phone: venue.phone,
    }
  })
}

/**
 * Discover from Resy
 */
async function discoverFromResy(
  city: string,
  neighborhood?: string,
  cuisine?: string,
  limit: number = 20
): Promise<DiscoveredRestaurant[]> {
  const query = [cuisine, neighborhood, 'private dining'].filter(Boolean).join(' ')
  const result = await searchResyVenues(city, query, limit)

  return result.venues.map((venue) => {
    const converted = resyVenueToDiscovered(venue)
    return {
      name: converted.name,
      category: 'Restaurant' as const,
      email: converted.contactEmail || generatePlaceholderEmail(converted.name),
      city: converted.city,
      neighborhood: converted.neighborhood,
      borough: 'Manhattan', // Resy venues in NYC are typically Manhattan
      cuisine: converted.cuisine,
      capacityMin: 10,
      capacityMax: 100,
      pricePerPersonMin: venue.priceRange * 30,
      pricePerPersonMax: venue.priceRange * 75,
      priceLevel: venue.priceRange,
      latitude: converted.latitude,
      longitude: converted.longitude,
      resyVenueId: converted.resyVenueId,
      discoverySource: 'resy' as const,
      website: converted.website,
      rating: converted.rating,
      // Reservation info
      reservationPlatform: converted.reservationPlatform,
      reservationUrl: converted.reservationUrl,
      hasOnlineReservation: converted.hasOnlineReservation,
    }
  })
}

/**
 * Discover from OpenTable (direct API)
 */
async function discoverFromOpenTable(
  city: string,
  neighborhood?: string,
  cuisine?: string,
  limit: number = 20
): Promise<DiscoveredRestaurant[]> {
  const metroId = getMetroId(city)
  const query = [cuisine, neighborhood, 'private dining'].filter(Boolean).join(' ')
  const result = await searchOpenTableVenues(metroId, query, 20, undefined, '19:00', limit)

  return result.venues.map((venue) => {
    const converted = openTableVenueToDiscovered(venue)
    return {
      name: converted.name,
      category: 'Restaurant' as const,
      email: converted.contactEmail || generatePlaceholderEmail(converted.name),
      city: converted.city,
      neighborhood: converted.neighborhood,
      address: converted.address,
      borough: extractBorough(converted.address || ''),
      cuisine: converted.cuisine,
      capacityMin: 10,
      capacityMax: 100,
      pricePerPersonMin: venue.priceRange * 30,
      pricePerPersonMax: venue.priceRange * 75,
      priceLevel: venue.priceRange,
      latitude: converted.latitude,
      longitude: converted.longitude,
      opentableId: converted.opentableId,
      discoverySource: 'opentable' as const,
      website: converted.website,
      rating: converted.rating,
      // Reservation info
      reservationPlatform: converted.reservationPlatform,
      reservationUrl: converted.reservationUrl,
      hasOnlineReservation: converted.hasOnlineReservation,
    }
  })
}

/**
 * Discover from OpenTable via Clawdbot (browser automation fallback)
 */
async function discoverFromOpenTableClawdbot(
  neighborhood?: string,
  partySize: number = 20
): Promise<DiscoveredRestaurant[]> {
  const results = await discoverOpenTablePrivateDining({
    city: 'New York',
    neighborhood,
    partySize,
    privateEventOnly: true,
  })

  return results.map((r) => ({
    name: r.name,
    category: 'Restaurant' as const,
    email: r.contactEmail || generatePlaceholderEmail(r.name),
    city: r.city,
    neighborhood: r.neighborhood,
    cuisine: r.cuisine,
    capacityMin: r.privateDiningCapacityMin || 10,
    capacityMax: r.privateDiningCapacityMax || 100,
    pricePerPersonMin: 75,
    pricePerPersonMax: 200,
    latitude: r.latitude,
    longitude: r.longitude,
    opentableId: r.opentableId,
    discoverySource: 'opentable' as const,
    website: r.website,
    phone: r.phone,
    hasPrivateDining: r.hasPrivateDining,
    privateDiningCapacityMin: r.privateDiningCapacityMin,
    privateDiningCapacityMax: r.privateDiningCapacityMax,
    privateDiningMinimum: r.privateDiningMinimum,
  }))
}

/**
 * Discover from Beli via Clawdbot
 */
async function discoverFromBeli(limit: number = 50): Promise<DiscoveredRestaurant[]> {
  const results = await getBeliRankings({
    city: 'New York',
    limit,
  })

  return results.map((r) => ({
    name: r.name,
    category: 'Restaurant' as const,
    email: r.contactEmail || generatePlaceholderEmail(r.name),
    city: r.city,
    neighborhood: r.neighborhood,
    cuisine: r.cuisine,
    capacityMin: 10,
    capacityMax: 80,
    pricePerPersonMin: 60,
    pricePerPersonMax: 150,
    latitude: r.latitude,
    longitude: r.longitude,
    beliRank: r.beliRank,
    discoverySource: 'beli' as const,
    website: r.website,
    phone: r.phone,
  }))
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Merge data from a duplicate restaurant record
 * Prioritizes keeping existing data, adds new fields
 */
function mergeRestaurantData(
  existing: DiscoveredRestaurant,
  newData: DiscoveredRestaurant
): void {
  // Add platform IDs if not present
  if (!existing.resyVenueId && newData.resyVenueId) {
    existing.resyVenueId = newData.resyVenueId
  }
  if (!existing.opentableId && newData.opentableId) {
    existing.opentableId = newData.opentableId
  }
  if (!existing.beliRank && newData.beliRank) {
    existing.beliRank = newData.beliRank
  }
  if (!existing.googlePlaceId && newData.googlePlaceId) {
    existing.googlePlaceId = newData.googlePlaceId
  }

  // Add private dining info if not present
  if (!existing.hasPrivateDining && newData.hasPrivateDining) {
    existing.hasPrivateDining = newData.hasPrivateDining
    existing.privateDiningCapacityMin = newData.privateDiningCapacityMin
    existing.privateDiningCapacityMax = newData.privateDiningCapacityMax
    existing.privateDiningMinimum = newData.privateDiningMinimum
  }

  // Prefer higher confidence email
  if (newData.emailConfidence &&
      (!existing.emailConfidence || newData.emailConfidence > existing.emailConfidence)) {
    existing.email = newData.email
    existing.emailConfidence = newData.emailConfidence
  }

  // Add cuisine if missing
  if (!existing.cuisine && newData.cuisine) {
    existing.cuisine = newData.cuisine
  }
}
