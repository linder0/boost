/**
 * Restaurant Discovery Module
 * VROOM Select: Orchestrates discovery from multiple sources
 * - Google Places API
 * - Resy (unofficial API)
 * - Clawdbot (OpenTable, Beli browser automation)
 * - Hunter.io (email enrichment)
 */

import { searchVenues, geocodeVenueByName, GooglePlaceVenue } from './google-places'
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
  searchExaVenues,
  exaVenueToDiscovered,
  ExaVenue,
} from './exa'
import {
  estimatePriceRange,
  extractNeighborhood,
  extractBorough,
  buildSearchQuery,
} from './utils'

// Re-exports for external use
export { searchVenues, geocodeVenueByName } from './google-places'
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
export { searchExaVenues } from './exa'
export type { ExaVenue, ExaSearchResult } from './exa'
export * from './utils'

// ============================================================================
// Types
// ============================================================================

export type DiscoverySource = 'google_places' | 'resy' | 'opentable' | 'beli' | 'exa' | 'demo'

export interface DiscoveredRestaurant {
  name: string
  category: 'Restaurant'
  email?: string
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
  neighborhood?: string // Single neighborhood (legacy support)
  neighborhoods?: string[] // Multiple neighborhoods
  bounds?: LocationBounds // Map area bounds (overrides neighborhoods)
  cuisine?: string
  partySize?: number
  date?: string
  requirePrivateDining?: boolean
  sources?: DiscoverySource[]
  limit?: number
  logger?: DiscoveryLogger // Optional callback for logging
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
    bounds,
    cuisine,
    partySize = 20,
    sources = ['google_places', 'resy'],
    limit = 30,
    logger,
  } = options

  // Helper to log if logger is provided (with small delay for smooth UI)
  const log = async (message: string, level?: DiscoveryLogEvent['level'], delayMs: number = 200) => {
    if (logger) {
      await logger({ message, level })
      await sleep(delayMs)
    }
  }

  // Build list of neighborhoods to search (only if no bounds provided)
  // When bounds are provided, we use them directly instead of neighborhoods
  const searchNeighborhoods = bounds
    ? [undefined] // Don't use neighborhoods when using map bounds
    : neighborhoods?.length
      ? neighborhoods
      : neighborhood
        ? [neighborhood]
        : [undefined] // Search without neighborhood filter if none provided

  // Log the search parameters (single source of truth for what we're searching)
  await log(`Starting restaurant discovery in ${city}...`, undefined, 300)

  const sourceLabels = sources.map((s) => {
    switch (s) {
      case 'google_places': return 'Google Places'
      case 'resy': return 'Resy'
      case 'opentable': return 'OpenTable'
      case 'beli': return 'Beli'
      case 'exa': return 'Exa'
      default: return s
    }
  })
  await log(`Searching: ${sourceLabels.join(', ')}...`)

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

  // Calculate per-neighborhood limit to stay within total limit
  const perNeighborhoodLimit = Math.ceil(limit / searchNeighborhoods.length)

  // Search each neighborhood
  for (const hood of searchNeighborhoods) {
    // Parallel discovery from enabled sources for this neighborhood
    const discoveryPromises: Promise<DiscoveredRestaurant[]>[] = []

    if (sources.includes('google_places')) {
      discoveryPromises.push(
        discoverFromGooglePlaces(city, hood, cuisine, perNeighborhoodLimit, partySize, bounds).catch((err) => {
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

    if (sources.includes('exa')) {
      discoveryPromises.push(
        discoverFromExa(city, cuisine, perNeighborhoodLimit, hood, partySize).catch((err) => {
          console.error('Exa discovery error:', err)
          return []
        })
      )
    }

    // Wait for all sources for this neighborhood
    const results = await Promise.all(discoveryPromises)

    // Collect unique results by source for fair interleaving
    const resultsBySource: DiscoveredRestaurant[][] = []

    for (const sourceResults of results) {
      const uniqueFromSource: DiscoveredRestaurant[] = []
      console.log(`[Discovery] Processing ${sourceResults.length} results from source`)

      for (const restaurant of sourceResults) {
        const normalizedName = restaurant.name.toLowerCase().trim()
        if (!seenNames.has(normalizedName)) {
          seenNames.add(normalizedName)
          uniqueFromSource.push(restaurant)
        } else {
          console.log(`[Discovery] Duplicate skipped: "${restaurant.name}" (${restaurant.discoverySource})`)
          // Merge data from duplicate (e.g., add beliRank from Beli to existing record)
          const existing = allResults.find(
            (r) => r.name.toLowerCase().trim() === normalizedName
          )
          if (existing) {
            mergeRestaurantData(existing, restaurant)
          }
        }
      }

      if (uniqueFromSource.length > 0) {
        resultsBySource.push(uniqueFromSource)
      }
    }

    // Interleave results from different sources (round-robin)
    let index = 0
    let hasMore = true
    while (hasMore) {
      hasMore = false
      for (const sourceResults of resultsBySource) {
        if (index < sourceResults.length) {
          allResults.push(sourceResults[index])
          hasMore = true
        }
      }
      index++
    }
  }

  const finalResults = allResults.slice(0, limit)

  // Enrich Exa-only results with location data via Google Places lookup
  const exaOnlyResults = finalResults.filter(
    (r) => r.discoverySource === 'exa' && !r.latitude
  )
  if (exaOnlyResults.length > 0) {
    await log(`Geocoding ${exaOnlyResults.length} Exa results...`)
    let geocodedCount = 0
    for (const restaurant of exaOnlyResults) {
      const geocoded = await geocodeVenueByName(restaurant.name, city)
      if (geocoded) {
        restaurant.latitude = geocoded.latitude
        restaurant.longitude = geocoded.longitude
        restaurant.address = geocoded.address
        restaurant.phone = geocoded.phone
        restaurant.googlePlaceId = geocoded.googlePlaceId
        if (geocoded.rating) restaurant.rating = geocoded.rating
        if (geocoded.priceLevel) restaurant.pricePerPersonMax = geocoded.priceLevel * 50
        geocodedCount++
      }
    }
    if (geocodedCount > 0) {
      await log(`${geocodedCount} Exa results enriched with location data`)
    }
  }

  // Log results summary
  if (finalResults.length === 0) {
    await log('No restaurants found. Try adjusting your search criteria.', 'warn')
  } else {
    await log(`Found ${finalResults.length} restaurants`, 'success')

    // Summary by source
    const bySource = finalResults.reduce((acc, r) => {
      acc[r.discoverySource] = (acc[r.discoverySource] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const sourceSummary = Object.entries(bySource)
      .map(([source, count]) => `${count} from ${source}`)
      .join(', ')
    await log(`Discovery complete! ${sourceSummary}`, 'success')

    const withPrivateDining = finalResults.filter((r) => r.hasPrivateDining).length
    const withEmails = finalResults.filter((r) => r.email).length

    if (withPrivateDining > 0) {
      await log(`${withPrivateDining} with verified private dining`)
    }

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
// Source-Specific Discovery
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
    // For large groups, focus on venues with private dining/event space
    searchTypes = ['private dining large group', 'event space restaurant', 'banquet restaurant']
  } else if (partySize && partySize > 8) {
    // For medium groups
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
      cuisine: cuisine || undefined, // Use the cuisine search term
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

/**
 * Discover from Resy
 */
async function discoverFromResy(
  city: string,
  neighborhood?: string,
  cuisine?: string,
  limit: number = 20
): Promise<DiscoveredRestaurant[]> {
  const query = buildSearchQuery([cuisine, neighborhood, 'private dining'])
  const result = await searchResyVenues(city, query, limit)

  return result.venues.map((venue) => {
    const converted = resyVenueToDiscovered(venue)
    return {
      name: converted.name,
      category: 'Restaurant' as const,
      email: converted.contactEmail,
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
  const query = buildSearchQuery([cuisine, neighborhood, 'private dining'])
  const result = await searchOpenTableVenues(metroId, query, 20, undefined, '19:00', limit)

  return result.venues.map((venue) => {
    const converted = openTableVenueToDiscovered(venue)
    return {
      name: converted.name,
      category: 'Restaurant' as const,
      email: converted.contactEmail,
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
    email: r.contactEmail,
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
    email: r.contactEmail,
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

/**
 * Discover from Exa (semantic web search)
 */
async function discoverFromExa(
  city: string,
  cuisine?: string,
  limit: number = 20,
  neighborhood?: string,
  partySize?: number
): Promise<DiscoveredRestaurant[]> {
  const venues = await searchExaVenues(city, cuisine, limit, neighborhood, partySize)

  console.log(`[Exa] Converting ${venues.length} venues to DiscoveredRestaurant format`)
  venues.forEach((v, i) => console.log(`  [Exa] ${i + 1}. ${v.name}`))

  return venues.map((venue) => ({
    name: venue.name,
    category: 'Restaurant' as const,
    city,
    neighborhood, // Pass through the neighborhood used in search
    // Exa doesn't provide structured location data, so we leave these undefined
    // They can be enriched later via Google Places API if needed
    capacityMin: 10,
    capacityMax: 100,
    pricePerPersonMin: 75,
    pricePerPersonMax: 200,
    discoverySource: 'exa' as const,
    website: venue.url,
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
