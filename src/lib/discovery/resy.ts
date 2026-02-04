/**
 * Resy API Client
 * Unofficial API integration for restaurant discovery and availability checking
 * Based on reverse-engineered API from community projects
 *
 * Note: This is an unofficial API and may break if Resy changes their endpoints.
 * Use responsibly and consider rate limiting.
 */

const RESY_API_BASE = 'https://api.resy.com'
const RESY_API_KEY = process.env.RESY_API_KEY // Optional: Resy uses public endpoints for search

// ============================================================================
// Types
// ============================================================================

export interface ResyVenue {
  id: number
  name: string
  neighborhood: string
  cuisine: string
  priceRange: number // 1-4
  rating?: number
  latitude: number
  longitude: number
  website?: string
  images?: string[]
  tagline?: string
  urlSlug?: string // URL-friendly venue identifier for booking links
}

export interface ResySlot {
  time: string // HH:mm format
  token: string
  type: string // e.g., "Dining Room", "Bar", "Private Dining"
}

export interface ResyAvailability {
  venueId: number
  date: string // YYYY-MM-DD
  partySize: number
  slots: ResySlot[]
}

export interface ResySearchResult {
  venues: ResyVenue[]
  totalCount: number
}

interface ResyAPIVenueResponse {
  id: { resy: number }
  name: string
  location: {
    neighborhood: string
    latitude: number
    longitude: number
  }
  cuisine: { name: string }[]
  price_range: number
  rating?: { average: number }
  images?: string[]
  tagline?: string
  url_slug: string
}

interface ResyAPISearchResponse {
  search: {
    hits: ResyAPIVenueResponse[]
    nbHits: number
  }
}

interface ResyAPIAvailabilityResponse {
  results: {
    venues: Array<{
      venue: { id: { resy: number } }
      slots: Array<{
        date: { start: string }
        config: { token: string; type: string }
      }>
    }>
  }
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Search for restaurants on Resy
 * @param city City to search in (e.g., "new-york-ny")
 * @param query Optional search query
 * @param limit Number of results to return
 */
export async function searchResyVenues(
  city: string = 'new-york-ny',
  query?: string,
  limit: number = 20
): Promise<ResySearchResult> {
  // Check for API key
  if (!RESY_API_KEY) {
    console.warn('[Resy] No RESY_API_KEY configured - skipping Resy search')
    return { venues: [], totalCount: 0 }
  }

  try {
    // Normalize city name for Resy
    const normalizedCity = normalizeCity(city)

    // Build search URL
    const searchParams = new URLSearchParams({
      city: normalizedCity,
      per_page: limit.toString(),
    })

    if (query) {
      searchParams.set('query', query)
    }

    console.log(`[Resy] Searching: city=${normalizedCity}, query=${query || 'none'}`)

    const response = await fetch(
      `${RESY_API_BASE}/3/venuesearch/search?${searchParams}`,
      {
        headers: {
          'Authorization': `ResyAPI api_key="${RESY_API_KEY}"`,
          'Content-Type': 'application/json',
          'X-Resy-Universal-Auth': RESY_API_KEY,
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read response')
      console.error(`[Resy] Search failed: HTTP ${response.status} - ${errorText.slice(0, 200)}`)
      return { venues: [], totalCount: 0 }
    }

    const data: ResyAPISearchResponse = await response.json()

    const venues: ResyVenue[] = data.search.hits.map((hit) => ({
      id: hit.id.resy,
      name: hit.name,
      neighborhood: hit.location.neighborhood,
      cuisine: hit.cuisine?.[0]?.name || 'American',
      priceRange: hit.price_range,
      rating: hit.rating?.average,
      latitude: hit.location.latitude,
      longitude: hit.location.longitude,
      images: hit.images,
      tagline: hit.tagline,
      urlSlug: hit.url_slug,
    }))

    console.log(`[Resy] Found ${venues.length} venues`)
    return {
      venues,
      totalCount: data.search.nbHits,
    }
  } catch (error) {
    console.error('[Resy] Search error:', error instanceof Error ? error.message : error)
    return { venues: [], totalCount: 0 }
  }
}

/**
 * Check availability for a specific venue
 * @param venueId Resy venue ID
 * @param date Date to check (YYYY-MM-DD)
 * @param partySize Number of guests
 */
export async function checkResyAvailability(
  venueId: number,
  date: string,
  partySize: number
): Promise<ResyAvailability> {
  try {
    const searchParams = new URLSearchParams({
      venue_id: venueId.toString(),
      day: date,
      party_size: partySize.toString(),
    })

    const response = await fetch(
      `${RESY_API_BASE}/4/find?${searchParams}`,
      {
        headers: {
          'Authorization': RESY_API_KEY ? `ResyAPI api_key="${RESY_API_KEY}"` : '',
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      console.warn(`Resy availability check failed: ${response.status}`)
      return { venueId, date, partySize, slots: [] }
    }

    const data: ResyAPIAvailabilityResponse = await response.json()

    const venueData = data.results.venues.find((v) => v.venue.id.resy === venueId)
    if (!venueData) {
      return { venueId, date, partySize, slots: [] }
    }

    const slots: ResySlot[] = venueData.slots.map((slot) => ({
      time: extractTime(slot.date.start),
      token: slot.config.token,
      type: slot.config.type,
    }))

    return { venueId, date, partySize, slots }
  } catch (error) {
    console.error('Resy availability error:', error)
    return { venueId, date, partySize, slots: [] }
  }
}

/**
 * Search for restaurants with private dining options
 * Uses neighborhood and cuisine filters to find suitable venues
 */
export async function searchPrivateDining(
  neighborhood?: string,
  cuisine?: string,
  minCapacity?: number
): Promise<ResyVenue[]> {
  // Resy doesn't have a direct private dining filter, so we search broadly
  // and would need to filter results or use Clawdbot for detailed scraping
  const query = [
    'private dining',
    neighborhood,
    cuisine,
  ].filter(Boolean).join(' ')

  const result = await searchResyVenues('new-york-ny', query, 50)
  return result.venues
}

import { extractTime } from './utils'

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize city name to Resy URL format
 */
function normalizeCity(city: string): string {
  const cityMap: Record<string, string> = {
    'new york': 'new-york-ny',
    'nyc': 'new-york-ny',
    'manhattan': 'new-york-ny',
    'brooklyn': 'new-york-ny',
    'new york city': 'new-york-ny',
  }

  const normalized = city.toLowerCase().trim()
  return cityMap[normalized] || normalized.replace(/\s+/g, '-')
}

/**
 * Convert Resy venue to our discovered restaurant format
 */
export function resyVenueToDiscovered(venue: ResyVenue): {
  name: string
  category: 'Restaurant'
  contactEmail: string
  neighborhood: string
  city: string
  cuisine: string
  latitude: number
  longitude: number
  rating?: number
  discoverySource: 'resy'
  resyVenueId: string
  website?: string
  // Reservation info
  reservationPlatform: 'resy'
  reservationUrl?: string
  hasOnlineReservation: boolean
} {
  return {
    name: venue.name,
    category: 'Restaurant',
    contactEmail: '', // Resy doesn't expose emails, need Hunter.io or Clawdbot
    neighborhood: venue.neighborhood,
    city: 'New York',
    cuisine: venue.cuisine,
    latitude: venue.latitude,
    longitude: venue.longitude,
    rating: venue.rating,
    discoverySource: 'resy',
    resyVenueId: venue.id.toString(),
    website: venue.website,
    // Reservation info
    reservationPlatform: 'resy',
    reservationUrl: venue.urlSlug ? `https://resy.com/cities/ny/${venue.urlSlug}` : undefined,
    hasOnlineReservation: true,
  }
}
