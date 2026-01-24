/**
 * Mapbox Geocoding utilities
 */

const MAPBOX_GEOCODING_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places'

interface GeocodeResult {
  lat: number
  lng: number
  address: string
}

/**
 * Geocode an address string to coordinates
 */
export async function geocodeAddress(
  address: string
): Promise<GeocodeResult | null> {
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

      return {
        lat,
        lng,
        address: feature.place_name || address,
      }
    }

    return null
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

/**
 * Reverse geocode coordinates to an address
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string | null> {
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
      return data.features[0].place_name || null
    }

    return null
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return null
  }
}
