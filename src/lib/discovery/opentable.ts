/**
 * OpenTable API Client
 * Unofficial API integration for restaurant discovery and availability checking
 * Based on reverse-engineered public-facing API endpoints
 *
 * Note: This is an unofficial API and may break if OpenTable changes their endpoints.
 * For production use, apply for official API access at:
 * https://www.opentable.com/restaurant-solutions/api-partners/become-a-partner/
 */

const OPENTABLE_GQL_ENDPOINT = 'https://www.opentable.com/dapi/fe/gql'

// ============================================================================
// Types
// ============================================================================

export interface OpenTableVenue {
  rid: number // Restaurant ID
  name: string
  neighborhood: string
  cuisine: string
  priceRange: number // 1-4
  rating?: number
  reviewCount?: number
  latitude: number
  longitude: number
  primaryPhoto?: string
  urlSlug?: string
  address?: string
  city?: string
}

export interface OpenTableSlot {
  time: string // HH:mm format
  token?: string
  dateTime: string // ISO format
}

export interface OpenTableAvailability {
  rid: number
  date: string // YYYY-MM-DD
  partySize: number
  slots: OpenTableSlot[]
}

export interface OpenTableSearchResult {
  venues: OpenTableVenue[]
  totalCount: number
}

// GraphQL response types
interface GQLRestaurant {
  rid: number
  name: string
  primaryCuisine?: { name: string }
  priceRange?: number
  statistics?: {
    reviews?: { ratings?: { overall?: { rating: number } }; count?: number }
  }
  urls?: { profileLink?: { link: string } }
  primaryPhoto?: { medium?: { url: string } }
  location?: {
    latitude: number
    longitude: number
    neighborhood?: string
    address?: string
    city?: string
  }
}

interface GQLSearchResponse {
  data?: {
    restaurantSearch?: {
      restaurants?: GQLRestaurant[]
      totalCount?: number
    }
  }
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Search for restaurants on OpenTable
 * @param metro Metro area code (e.g., "4" for NYC)
 * @param query Search query (cuisine, restaurant name, etc.)
 * @param partySize Number of guests
 * @param date Date in YYYY-MM-DD format
 * @param time Time in HH:mm format
 * @param limit Number of results to return
 */
export async function searchOpenTableVenues(
  metro: string = '4', // NYC metro
  query?: string,
  partySize: number = 2,
  date?: string,
  time: string = '19:00',
  limit: number = 20
): Promise<OpenTableSearchResult> {
  try {
    // Default to tomorrow if no date provided
    const searchDate = date || getDefaultDate()
    const dateTime = `${searchDate}T${time}`

    // GraphQL query for restaurant search
    const gqlQuery = {
      operationName: 'RestaurantSearch',
      variables: {
        term: query || '',
        metroId: parseInt(metro),
        regionIds: [],
        cuisineIds: [],
        covers: partySize,
        dateTime,
        priceRangeIds: [],
        sort: 'RECOMMENDED',
        first: limit,
        forwardOnly: true,
        requiresAvailability: false,
      },
      query: `
        query RestaurantSearch($term: String, $metroId: Int!, $covers: Int!, $dateTime: String!, $first: Int) {
          restaurantSearch(
            term: $term
            metroId: $metroId
            covers: $covers
            dateTime: $dateTime
            first: $first
          ) {
            totalCount
            restaurants {
              rid
              name
              primaryCuisine { name }
              priceRange
              statistics {
                reviews {
                  ratings { overall { rating } }
                  count
                }
              }
              urls { profileLink { link } }
              primaryPhoto { medium { url } }
              location {
                latitude
                longitude
                neighborhood
                address
                city
              }
            }
          }
        }
      `,
    }

    const response = await fetch(OPENTABLE_GQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      },
      body: JSON.stringify(gqlQuery),
    })

    if (!response.ok) {
      console.error('OpenTable search failed:', response.status)
      return { venues: [], totalCount: 0 }
    }

    const data: GQLSearchResponse = await response.json()

    if (!data.data?.restaurantSearch?.restaurants) {
      return { venues: [], totalCount: 0 }
    }

    const venues: OpenTableVenue[] = data.data.restaurantSearch.restaurants.map(
      (r) => ({
        rid: r.rid,
        name: r.name,
        neighborhood: r.location?.neighborhood || '',
        cuisine: r.primaryCuisine?.name || 'American',
        priceRange: r.priceRange || 2,
        rating: r.statistics?.reviews?.ratings?.overall?.rating,
        reviewCount: r.statistics?.reviews?.count,
        latitude: r.location?.latitude || 0,
        longitude: r.location?.longitude || 0,
        primaryPhoto: r.primaryPhoto?.medium?.url,
        urlSlug: extractSlugFromUrl(r.urls?.profileLink?.link),
        address: r.location?.address,
        city: r.location?.city,
      })
    )

    return {
      venues,
      totalCount: data.data.restaurantSearch.totalCount || venues.length,
    }
  } catch (error) {
    console.error('OpenTable search error:', error)
    return { venues: [], totalCount: 0 }
  }
}

/**
 * Check availability for a specific restaurant
 * @param rid Restaurant ID
 * @param partySize Number of guests
 * @param date Date in YYYY-MM-DD format
 */
export async function checkOpenTableAvailability(
  rid: number,
  partySize: number = 2,
  date?: string
): Promise<OpenTableAvailability> {
  try {
    const searchDate = date || getDefaultDate()

    const gqlQuery = {
      operationName: 'GetAvailability',
      variables: {
        rid,
        covers: partySize,
        date: searchDate,
      },
      query: `
        query GetAvailability($rid: Int!, $covers: Int!, $date: String!) {
          availability(rid: $rid, covers: $covers, date: $date) {
            slots {
              dateTime
              isAvailable
            }
          }
        }
      `,
    }

    const response = await fetch(OPENTABLE_GQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      },
      body: JSON.stringify(gqlQuery),
    })

    if (!response.ok) {
      return { rid, date: searchDate, partySize, slots: [] }
    }

    const data = await response.json()
    const slots: OpenTableSlot[] = (data.data?.availability?.slots || [])
      .filter((s: { isAvailable: boolean }) => s.isAvailable)
      .map((s: { dateTime: string }) => ({
        time: extractTime(s.dateTime),
        dateTime: s.dateTime,
      }))

    return { rid, date: searchDate, partySize, slots }
  } catch (error) {
    console.error('OpenTable availability error:', error)
    return { rid, date: date || getDefaultDate(), partySize, slots: [] }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get default date (tomorrow)
 */
function getDefaultDate(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().split('T')[0]
}

/**
 * Extract time from ISO datetime string
 */
function extractTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  } catch {
    return isoString
  }
}

/**
 * Extract URL slug from OpenTable profile link
 * e.g., "/r/restaurant-name-new-york" -> "restaurant-name-new-york"
 */
function extractSlugFromUrl(url?: string): string | undefined {
  if (!url) return undefined
  const match = url.match(/\/r\/([^?]+)/)
  return match ? match[1] : undefined
}

/**
 * Generate OpenTable reservation URL
 */
export function getOpenTableReservationUrl(
  venue: OpenTableVenue,
  partySize?: number,
  date?: string,
  time?: string
): string {
  const baseUrl = venue.urlSlug
    ? `https://www.opentable.com/r/${venue.urlSlug}`
    : `https://www.opentable.com/restref/client/?rid=${venue.rid}`

  const params = new URLSearchParams()
  if (partySize) params.set('covers', partySize.toString())
  if (date) params.set('dateTime', `${date}T${time || '19:00'}`)

  const queryString = params.toString()
  return queryString ? `${baseUrl}?${queryString}` : baseUrl
}

/**
 * Convert OpenTable venue to our discovered restaurant format
 */
export function openTableVenueToDiscovered(venue: OpenTableVenue): {
  name: string
  category: 'Restaurant'
  contactEmail: string
  neighborhood: string
  address?: string
  city: string
  cuisine: string
  latitude: number
  longitude: number
  rating?: number
  discoverySource: 'opentable'
  opentableId: string
  website?: string
  // Reservation info
  reservationPlatform: 'opentable'
  reservationUrl: string
  hasOnlineReservation: boolean
} {
  return {
    name: venue.name,
    category: 'Restaurant',
    contactEmail: '', // OpenTable doesn't expose emails
    neighborhood: venue.neighborhood,
    address: venue.address,
    city: venue.city || 'New York',
    cuisine: venue.cuisine,
    latitude: venue.latitude,
    longitude: venue.longitude,
    rating: venue.rating,
    discoverySource: 'opentable',
    opentableId: venue.rid.toString(),
    website: venue.urlSlug
      ? `https://www.opentable.com/r/${venue.urlSlug}`
      : undefined,
    // Reservation info
    reservationPlatform: 'opentable',
    reservationUrl: getOpenTableReservationUrl(venue),
    hasOnlineReservation: true,
  }
}

// ============================================================================
// Metro ID Mapping
// ============================================================================

/**
 * Map city names to OpenTable metro IDs
 */
export function getMetroId(city: string): string {
  const cityLower = city.toLowerCase().trim()
  const metroMap: Record<string, string> = {
    'new york': '4',
    nyc: '4',
    manhattan: '4',
    brooklyn: '4',
    'new york city': '4',
    'los angeles': '6',
    la: '6',
    chicago: '3',
    'san francisco': '1',
    sf: '1',
    boston: '5',
    miami: '11',
    'washington dc': '12',
    dc: '12',
    seattle: '9',
    philadelphia: '8',
    houston: '14',
    dallas: '13',
    atlanta: '7',
    denver: '15',
    austin: '40',
  }

  return metroMap[cityLower] || '4' // Default to NYC
}
