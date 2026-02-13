/**
 * Restaurant Discovery Module
 * Simplified to use Google Places API for search
 * and Hunter.io for email enrichment
 */

import { searchVenues, geocodeVenueByName } from './google-places'
import { findEmailsBatch, HunterEmailResult } from './hunter'
import {
  estimatePriceRange,
  extractNeighborhood,
  extractBorough,
} from './utils'

// Re-exports for external use
export { searchVenues, geocodeVenueByName, enrichVenueFromGooglePlaces } from './google-places'
export type { GooglePlaceVenue } from './google-places'
export { findEmail, findEmailsBatch } from './hunter'
export type { HunterEmailResult } from './hunter'
export * from './utils'

// ============================================================================
// Types
// ============================================================================

export type DiscoverySource = 'google_places'

export interface DiscoveredRestaurant {
  name: string
  category: 'Restaurant'
  email?: string
  city: string
  neighborhood?: string
  address?: string
  borough?: string
  cuisine?: string
  priceLevel?: number
  capacityMin: number
  capacityMax: number
  pricePerPersonMin: number
  pricePerPersonMax: number
  latitude?: number
  longitude?: number
  googlePlaceId?: string
  emailConfidence?: number
  discoverySource: DiscoverySource
  website?: string
  rating?: number
  phone?: string
  hasPrivateDining?: boolean
  privateDiningCapacityMin?: number
  privateDiningCapacityMax?: number
  privateDiningMinimum?: number
}

export interface DiscoveryLogEvent {
  message: string
  level?: 'info' | 'success' | 'warn' | 'error'
}

export type DiscoveryLogger = (event: DiscoveryLogEvent) => void | Promise<void>

export interface LocationBounds {
  ne: { lat: number; lng: number }
  sw: { lat: number; lng: number }
}

export interface DiscoveryOptions {
  city?: string
  neighborhood?: string
  neighborhoods?: string[]
  bounds?: LocationBounds
  cuisine?: string
  partySize?: number
  limit?: number
  logger?: DiscoveryLogger
}

// ============================================================================
// Main Discovery Function
// ============================================================================

/**
 * Discover restaurants using Google Places API
 * Supports searching across multiple neighborhoods or map bounds
 */
export async function discoverRestaurants(
  options: DiscoveryOptions = {}
): Promise<DiscoveredRestaurant[]> {
  const {
    city = 'New York',
    neighborhood,
    neighborhoods,
    bounds,
    cuisine,
    partySize = 20,
    limit = 30,
    logger,
  } = options

  // Helper to log if logger is provided
  const log = async (message: string, level?: DiscoveryLogEvent['level'], delayMs: number = 200) => {
    if (logger) {
      await logger({ message, level })
      await sleep(delayMs)
    }
  }

  // Build list of neighborhoods to search (only if no bounds provided)
  const searchNeighborhoods = bounds
    ? [undefined]
    : neighborhoods?.length
      ? neighborhoods
      : neighborhood
        ? [neighborhood]
        : [undefined]

  await log(`Starting restaurant discovery in ${city}...`, undefined, 300)
  await log(`Searching: Google Places...`)

  if (bounds) {
    await log(`Location: Map area`)
  } else if (searchNeighborhoods.length > 0 && searchNeighborhoods[0]) {
    await log(`Neighborhoods: ${searchNeighborhoods.filter(Boolean).join(', ')}`)
  }

  if (cuisine) {
    await log(`Cuisine: ${cuisine}`)
  }

  if (partySize) {
    await log(`Party size: ${partySize} guests`)
  }

  const allResults: DiscoveredRestaurant[] = []
  const seenNames = new Set<string>()

  const perNeighborhoodLimit = Math.ceil(limit / searchNeighborhoods.length)

  // Search each neighborhood
  for (const hood of searchNeighborhoods) {
    try {
      const results = await discoverFromGooglePlaces(
        city,
        hood,
        cuisine,
        perNeighborhoodLimit,
        partySize,
        bounds
      )

      for (const restaurant of results) {
        const normalizedName = restaurant.name.toLowerCase().trim()
        if (!seenNames.has(normalizedName)) {
          seenNames.add(normalizedName)
          allResults.push(restaurant)
        }
      }
    } catch (err) {
      console.error('Google Places discovery error:', err)
    }
  }

  const finalResults = allResults.slice(0, limit)

  // Log results summary
  if (finalResults.length === 0) {
    await log('No restaurants found. Try adjusting your search criteria.', 'warn')
  } else {
    await log(`Found ${finalResults.length} restaurants`, 'success')
    await log(`Discovery complete!`, 'success')

    const withEmails = finalResults.filter((r) => r.email).length
    if (withEmails > 0) {
      await log(`${withEmails} with verified contact emails`)
    }
  }

  return finalResults
}

// Helper for delays
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ============================================================================
// Google Places Discovery
// ============================================================================

/**
 * Discover from Google Places
 */
async function discoverFromGooglePlaces(
  city: string,
  neighborhood?: string,
  cuisine?: string,
  limit: number = 20,
  partySize?: number,
  bounds?: LocationBounds
): Promise<DiscoveredRestaurant[]> {
  // Build search types based on filters
  let searchTypes: string[]
  if (cuisine) {
    searchTypes = [cuisine.toLowerCase(), 'restaurant']
  } else if (partySize && partySize > 20) {
    searchTypes = ['private dining large group', 'event space restaurant', 'banquet restaurant']
  } else if (partySize && partySize > 8) {
    searchTypes = ['private dining group', 'restaurant private room']
  } else {
    searchTypes = ['restaurant', 'private_dining']
  }

  const googleVenues = await searchVenues(city, searchTypes, limit, neighborhood, bounds)

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

    return {
      name: venue.name,
      category: 'Restaurant' as const,
      email: emailResult?.email,
      emailConfidence: emailResult?.confidence,
      city,
      neighborhood: extractNeighborhood(venue.address),
      address: venue.address,
      borough: extractBorough(venue.address),
      cuisine: cuisine || undefined,
      priceLevel: venue.priceLevel,
      capacityMin: 20,
      capacityMax: 150,
      pricePerPersonMin: priceRange.min,
      pricePerPersonMax: priceRange.max,
      latitude: venue.latitude,
      longitude: venue.longitude,
      googlePlaceId: venue.googlePlaceId,
      discoverySource: 'google_places' as const,
      website: venue.website,
      rating: venue.rating,
      phone: venue.phone,
    }
  })
}
