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

/**
 * Search for restaurants using Google Places Text Search API
 */
export async function searchVenues(
  city: string,
  searchTypes: string[] = ['restaurant', 'bar'],
  limit = 20,
  neighborhood?: string
): Promise<GooglePlaceVenue[]> {
  if (!GOOGLE_PLACES_API_KEY) {
    console.warn('GOOGLE_PLACES_API_KEY not set, returning empty results')
    return []
  }

  const allResults: GooglePlaceVenue[] = []
  const seenPlaceIds = new Set<string>()
  const seenNames = new Set<string>()
  const seenWebsites = new Set<string>()

  // Search for each type
  const searchPromises = searchTypes.map(async (type) => {
    const config = getSearchConfig(type)
    const queryPart = config?.query || `${type} restaurant private dining`
    const category: EntityCategory = 'Restaurant'
    // Include neighborhood in search if provided for more targeted results
    const locationPart = neighborhood ? `${neighborhood}, ${city}` : city
    const query = `${queryPart} in ${locationPart}`

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
            maxResultCount: Math.ceil(limit / searchTypes.length),
          }),
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
