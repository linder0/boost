/**
 * Vendor Discovery Module
 * Orchestrates venue discovery from Google Places and email enrichment via Hunter.io
 */

import { searchVenues, GooglePlaceVenue } from './google-places'
import { findEmail, findEmailsBatch, HunterEmailResult } from './hunter'
import { DemoVenue } from '@/lib/demo/venues'

export { searchVenues, GooglePlaceVenue } from './google-places'
export { findEmail, findEmailsBatch, HunterEmailResult } from './hunter'

export interface DiscoveredVenue extends DemoVenue {
  googlePlaceId?: string
  emailConfidence?: number
  discoverySource: 'google_places' | 'demo'
  website?: string
  rating?: number
}

// Default venue type mapping based on price level
function estimatePriceRange(priceLevel?: number): { min: number; max: number } {
  switch (priceLevel) {
    case 0:
    case 1:
      return { min: 30, max: 60 }
    case 2:
      return { min: 60, max: 100 }
    case 3:
      return { min: 100, max: 175 }
    case 4:
      return { min: 150, max: 250 }
    default:
      return { min: 75, max: 150 }
  }
}

// Extract neighborhood from address
function extractNeighborhood(address: string): string | undefined {
  // Try to extract neighborhood from address (usually before city)
  const parts = address.split(',').map((p) => p.trim())
  if (parts.length >= 3) {
    return parts[1] // Usually neighborhood is second part
  }
  return undefined
}

/**
 * Discover venues for an event using Google Places + Hunter.io
 * Returns venues in the DemoVenue format for compatibility with existing UI
 */
export async function discoverVenues(
  city: string,
  venueTypes: string[] = ['restaurant', 'bar', 'rooftop'],
  limit = 20
): Promise<DiscoveredVenue[]> {
  // Step 1: Search Google Places
  const googleVenues = await searchVenues(city, venueTypes, limit)
  
  if (googleVenues.length === 0) {
    console.log('No venues found from Google Places')
    return []
  }

  // Step 2: Enrich with Hunter emails (for venues that have websites)
  const venuesWithWebsites = googleVenues.filter((v) => v.website)
  const websiteUrls = venuesWithWebsites.map((v) => v.website!)
  
  let emailResults = new Map<string, HunterEmailResult | null>()
  if (websiteUrls.length > 0) {
    emailResults = await findEmailsBatch(websiteUrls)
  }

  // Step 3: Convert to DemoVenue format
  const discoveredVenues: DiscoveredVenue[] = googleVenues.map((venue) => {
    const emailResult = venue.website ? emailResults.get(venue.website) : null
    const priceRange = estimatePriceRange(venue.priceLevel)
    
    // Generate a placeholder email if Hunter didn't find one
    // In production, you'd want to handle venues without emails differently
    const email = emailResult?.email || generatePlaceholderEmail(venue.name)

    return {
      name: venue.name,
      category: 'Venue',
      email,
      city,
      neighborhood: extractNeighborhood(venue.address),
      venueTypes: venueTypes.length > 0 ? [venueTypes[0]] : ['restaurant'],
      capacityMin: 20, // Default estimates since Google doesn't provide this
      capacityMax: 150,
      pricePerPersonMin: priceRange.min,
      pricePerPersonMax: priceRange.max,
      indoorOutdoor: 'both' as const,
      catering: {
        food: true,
        drinks: true,
        externalAllowed: false,
      },
      latitude: venue.latitude,
      longitude: venue.longitude,
      googlePlaceId: venue.googlePlaceId,
      emailConfidence: emailResult?.confidence,
      discoverySource: 'google_places',
    }
  })

  return discoveredVenues
}

/**
 * Generate a placeholder email for venues where we couldn't find a real one
 * This is just for demo purposes - in production you'd handle this differently
 */
function generatePlaceholderEmail(venueName: string): string {
  const slug = venueName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 20)
  return `events@${slug}.com`
}
