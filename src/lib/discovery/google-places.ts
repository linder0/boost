/**
 * Google Places API integration for venue discovery
 * Uses the Places API (New) Text Search endpoint
 */

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
  category: 'Venue' | 'Caterer' | 'Photographer' | 'DJ' | 'Florist' | 'Planner' | 'Vendor'
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

// Map search types to Google Places queries and categories
interface SearchTypeConfig {
  query: string
  category: GooglePlaceVenue['category']
}

const SEARCH_TYPE_CONFIG: Record<string, SearchTypeConfig> = {
  // Venues
  rooftop: { query: 'rooftop bar private events', category: 'Venue' },
  restaurant: { query: 'restaurant private dining events', category: 'Venue' },
  bar: { query: 'bar private events', category: 'Venue' },
  lounge: { query: 'lounge private events', category: 'Venue' },
  cafe: { query: 'cafe private events', category: 'Venue' },
  wellness: { query: 'spa wellness private events', category: 'Venue' },
  venue: { query: 'event venue private events', category: 'Venue' },
  // Vendors
  caterer: { query: 'catering service events', category: 'Caterer' },
  catering: { query: 'catering company events', category: 'Caterer' },
  photographer: { query: 'event photographer', category: 'Photographer' },
  photography: { query: 'event photography services', category: 'Photographer' },
  dj: { query: 'DJ entertainment events', category: 'DJ' },
  music: { query: 'live music entertainment events', category: 'DJ' },
  florist: { query: 'florist event flowers', category: 'Florist' },
  flowers: { query: 'event floral arrangements', category: 'Florist' },
  planner: { query: 'event planner coordinator', category: 'Planner' },
}

function mapPriceLevel(priceLevel?: string): number | undefined {
  const mapping: Record<string, number> = {
    'PRICE_LEVEL_FREE': 0,
    'PRICE_LEVEL_INEXPENSIVE': 1,
    'PRICE_LEVEL_MODERATE': 2,
    'PRICE_LEVEL_EXPENSIVE': 3,
    'PRICE_LEVEL_VERY_EXPENSIVE': 4,
  }
  return priceLevel ? mapping[priceLevel] : undefined
}

/**
 * Search for venues and vendors using Google Places Text Search API
 */
export async function searchVenues(
  city: string,
  searchTypes: string[] = ['restaurant', 'bar'],
  limit = 20
): Promise<GooglePlaceVenue[]> {
  if (!GOOGLE_PLACES_API_KEY) {
    console.warn('GOOGLE_PLACES_API_KEY not set, returning empty results')
    return []
  }

  const allResults: GooglePlaceVenue[] = []
  const seenPlaceIds = new Set<string>()
  const seenNames = new Set<string>()
  
  // Normalize name for deduplication
  const normalizeName = (name: string) => 
    name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30)

  // Search for each type
  const searchPromises = searchTypes.map(async (type) => {
    const typeLower = type.toLowerCase()
    const config = SEARCH_TYPE_CONFIG[typeLower]
    const queryPart = config?.query || `${type} private events`
    const category = config?.category || 'Vendor'
    const query = `${queryPart} in ${city}`

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

  // Flatten and deduplicate results by ID and name
  for (const { places, category, searchType } of results) {
    for (const place of places) {
      const normalizedName = normalizeName(place.displayName.text)
      
      // Skip if we've seen this place ID or a very similar name
      if (seenPlaceIds.has(place.id) || seenNames.has(normalizedName)) {
        continue
      }
      
      seenPlaceIds.add(place.id)
      seenNames.add(normalizedName)
      
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
