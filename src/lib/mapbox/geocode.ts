/**
 * Mapbox Geocoding utilities
 */

const MAPBOX_GEOCODING_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places'

/**
 * Location data structure used throughout the app
 */
export interface LocationData {
  address: string
  lat: number
  lng: number
  city?: string
  neighborhood?: string
}

/**
 * Extract city and neighborhood from a Mapbox feature's context array
 */
export function extractLocationDetails(feature: any): { city?: string; neighborhood?: string } {
  const context = feature.context || []
  let city: string | undefined
  let neighborhood: string | undefined

  for (const item of context) {
    const id = item.id || ''
    if (id.startsWith('place.')) {
      city = item.text
    } else if (id.startsWith('neighborhood.') || id.startsWith('locality.')) {
      neighborhood = item.text
    }
  }

  // If the feature itself is a place (city), use it
  if (!city && feature.place_type?.includes('place')) {
    city = feature.text
  }

  return { city, neighborhood }
}

/**
 * Geocode an address string to coordinates with full location details
 */
export async function geocodeAddress(
  address: string
): Promise<LocationData | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  if (!token) {
    console.warn('Mapbox token not configured')
    return null
  }

  try {
    const encodedAddress = encodeURIComponent(address)
    const response = await fetch(
      `${MAPBOX_GEOCODING_URL}/${encodedAddress}.json?access_token=${token}&limit=1`
    )

    if (!response.ok) {
      console.error('Geocoding request failed:', response.statusText)
      return null
    }

    const data = await response.json()

    if (data.features && data.features.length > 0) {
      const feature = data.features[0]
      const [lng, lat] = feature.center
      const { city, neighborhood } = extractLocationDetails(feature)

      return {
        lat,
        lng,
        address: feature.place_name || address,
        city,
        neighborhood,
      }
    }

    return null
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

/**
 * Reverse geocode coordinates to full location data
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<Omit<LocationData, 'lat' | 'lng'> | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  if (!token) {
    console.warn('Mapbox token not configured')
    return null
  }

  try {
    const response = await fetch(
      `${MAPBOX_GEOCODING_URL}/${lng},${lat}.json?access_token=${token}&limit=1`
    )

    if (!response.ok) {
      console.error('Reverse geocoding request failed:', response.statusText)
      return null
    }

    const data = await response.json()

    if (data.features && data.features.length > 0) {
      const feature = data.features[0]
      const { city, neighborhood } = extractLocationDetails(feature)
      return {
        address: feature.place_name,
        city,
        neighborhood,
      }
    }

    return null
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return null
  }
}
