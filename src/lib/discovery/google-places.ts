/**
 * Google Places API integration for restaurant discovery
 * VROOM Select: Focused on NYC restaurants with private dining
 * Uses the Places API (New) Text Search endpoint
 */

import {
  getSearchConfig,
  type EntityCategory
} from '@/lib/entities'
import { mapPriceLevel, normalizeName } from './utils'
import { getNeighborhoodBounds } from './neighborhood-bounds'

// Generic names that aren't real restaurants - filter these out
const GENERIC_NAME_PATTERNS = [
  /^private dining$/i,
  /^private room$/i,
  /^event space$/i,
  /^banquet hall$/i,
  /^catering service$/i,
  /^restaurant$/i,
  /^dining room$/i,
]

function isGenericName(name: string): boolean {
  return GENERIC_NAME_PATTERNS.some(pattern => pattern.test(name.trim()))
}

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY

export interface GooglePlaceVenue {
  name: string
  address: string
  latitude: number
  longitude: number
  website?: string
  phone?: string
  rating?: number
  priceLevel?: number
  googlePlaceId: string
  category: EntityCategory
  searchType: string // The original search type used
}

interface PlacesTextSearchResponse {
  places?: Array<{
    id: string
    displayName: {
      text: string
      languageCode: string
    }
    formattedAddress: string
    location: {
      latitude: number
      longitude: number
    }
    websiteUri?: string
    nationalPhoneNumber?: string
    rating?: number
    priceLevel?: 'PRICE_LEVEL_FREE' | 'PRICE_LEVEL_INEXPENSIVE' | 'PRICE_LEVEL_MODERATE' | 'PRICE_LEVEL_EXPENSIVE' | 'PRICE_LEVEL_VERY_EXPENSIVE'
  }>
}

// Bounds type for map area restriction
interface LocationBounds {
  ne: { lat: number; lng: number }
  sw: { lat: number; lng: number }
}

/**
 * Search for restaurants using Google Places Text Search API
 */
export async function searchVenues(
  city: string,
  searchTypes: string[] = ['restaurant', 'bar'],
  limit = 20,
  neighborhood?: string,
  bounds?: LocationBounds
): Promise<GooglePlaceVenue[]> {
  if (!GOOGLE_PLACES_API_KEY) {
    console.warn('GOOGLE_PLACES_API_KEY not set, returning empty results')
    return []
  }

  const allResults: GooglePlaceVenue[] = []
  const seenPlaceIds = new Set<string>()
  const seenNames = new Set<string>()
  const seenWebsites = new Set<string>()

  // Use explicit bounds if provided, otherwise get neighborhood bounds
  const neighborhoodBounds = neighborhood ? getNeighborhoodBounds(neighborhood) : null

  // Search for each type
  const searchPromises = searchTypes.map(async (type) => {
    const config = getSearchConfig(type)
    const queryPart = config?.query || `${type} restaurant private dining`
    const category: EntityCategory = 'Restaurant'
    // Include neighborhood in search if provided for more targeted results
    const locationPart = neighborhood ? `${neighborhood}, ${city}` : city
    const query = `${queryPart} in ${locationPart}`

    // Build request body with optional location restriction
    const requestBody: Record<string, unknown> = {
      textQuery: query,
      maxResultCount: Math.ceil(limit / searchTypes.length),
    }

    // Add location restriction: explicit bounds take priority over neighborhood bounds
    if (bounds) {
      // Use explicit map area bounds
      requestBody.locationRestriction = {
        rectangle: {
          low: {
            latitude: bounds.sw.lat,
            longitude: bounds.sw.lng,
          },
          high: {
            latitude: bounds.ne.lat,
            longitude: bounds.ne.lng,
          },
        },
      }
    } else if (neighborhoodBounds) {
      // Use neighborhood bounds
      requestBody.locationRestriction = {
        rectangle: {
          low: {
            latitude: neighborhoodBounds.southwest.lat,
            longitude: neighborhoodBounds.southwest.lng,
          },
          high: {
            latitude: neighborhoodBounds.northeast.lat,
            longitude: neighborhoodBounds.northeast.lng,
          },
        },
      }
    }

    try {
      const response = await fetch(
        'https://places.googleapis.com/v1/places:searchText',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.websiteUri,places.nationalPhoneNumber,places.rating,places.priceLevel',
          },
          body: JSON.stringify(requestBody),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Google Places API error for "${type}":`, errorText)
        return { places: [], category, searchType: type }
      }

      const data: PlacesTextSearchResponse = await response.json()
      return { places: data.places || [], category, searchType: type }
    } catch (error) {
      console.error(`Error searching for ${type}:`, error)
      return { places: [], category, searchType: type }
    }
  })

  const results = await Promise.all(searchPromises)

  // Flatten and deduplicate results by ID, name, and website
  for (const { places, category, searchType } of results) {
    for (const place of places) {
      // Filter out generic names that aren't real restaurants
      if (isGenericName(place.displayName.text)) {
        continue
      }

      const normalizedName = normalizeName(place.displayName.text)
      const normalizedWebsite = place.websiteUri
        ? place.websiteUri.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
        : null

      // Skip if we've seen this place ID, similar name, or same website
      if (seenPlaceIds.has(place.id)) {
        continue
      }
      if (seenNames.has(normalizedName)) {
        continue
      }
      if (normalizedWebsite && seenWebsites.has(normalizedWebsite)) {
        continue
      }

      seenPlaceIds.add(place.id)
      seenNames.add(normalizedName)
      if (normalizedWebsite) {
        seenWebsites.add(normalizedWebsite)
      }

      allResults.push({
        name: place.displayName.text,
        address: place.formattedAddress,
        latitude: place.location.latitude,
        longitude: place.location.longitude,
        website: place.websiteUri,
        phone: place.nationalPhoneNumber,
        rating: place.rating,
        priceLevel: mapPriceLevel(place.priceLevel),
        googlePlaceId: place.id,
        category,
        searchType,
      })
    }
  }

  // Limit total results
  return allResults.slice(0, limit)
}

/**
 * Look up a single venue by name to get structured location data
 * Used to geocode Exa-only results that lack lat/lng
 */
export async function geocodeVenueByName(
  name: string,
  city: string
): Promise<GooglePlaceVenue | null> {
  if (!GOOGLE_PLACES_API_KEY) {
    console.warn('[Geocode] GOOGLE_PLACES_API_KEY not set')
    return null
  }

  // Search for the specific venue name in the city
  const query = `${name} restaurant ${city}`

  try {
    const response = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.websiteUri,places.nationalPhoneNumber,places.rating,places.priceLevel',
        },
        body: JSON.stringify({
          textQuery: query,
          maxResultCount: 3, // Get a few results to find best match
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Geocode] Google Places API error for "${name}":`, errorText)
      return null
    }

    const data: PlacesTextSearchResponse = await response.json()
    const places = data.places || []

    if (places.length === 0) {
      console.log(`[Geocode] No results found for "${name}"`)
      return null
    }

    // Find best match by comparing normalized names
    const normalizedSearchName = normalizeName(name)
    const bestMatch = places.find((place) => {
      const normalizedPlaceName = normalizeName(place.displayName.text)
      // Check if names are similar (one contains the other or they match)
      return normalizedPlaceName === normalizedSearchName ||
        normalizedPlaceName.includes(normalizedSearchName) ||
        normalizedSearchName.includes(normalizedPlaceName)
    }) || places[0] // Fall back to first result if no close match

    console.log(`[Geocode] Found "${bestMatch.displayName.text}" for "${name}"`)

    return {
      name: bestMatch.displayName.text,
      address: bestMatch.formattedAddress,
      latitude: bestMatch.location.latitude,
      longitude: bestMatch.location.longitude,
      website: bestMatch.websiteUri,
      phone: bestMatch.nationalPhoneNumber,
      rating: bestMatch.rating,
      priceLevel: mapPriceLevel(bestMatch.priceLevel),
      googlePlaceId: bestMatch.id,
      category: 'Restaurant' as const,
      searchType: 'geocode',
    }
  } catch (error) {
    console.error(`[Geocode] Error looking up "${name}":`, error)
    return null
  }
}
