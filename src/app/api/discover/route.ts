import { NextRequest } from 'next/server'
import {
  discoverRestaurants,
  DiscoveredRestaurant,
  DiscoverySource,
  DiscoveryLogEvent,
} from '@/lib/discovery'

// Helper to send SSE events
function sendEvent(
  controller: ReadableStreamDefaultController,
  type: string,
  data: Record<string, unknown>
) {
  const event = JSON.stringify({ type, ...data })
  controller.enqueue(new TextEncoder().encode(`data: ${event}\n\n`))
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const city = searchParams.get('city') || 'New York'
  const cuisine = searchParams.get('cuisine') || undefined
  const partySize = parseInt(searchParams.get('partySize') || '10', 10)

  // Support both single 'neighborhood' and multiple 'neighborhoods' params
  const neighborhoodsParam = searchParams.get('neighborhoods')
  const singleNeighborhood = searchParams.get('neighborhood')
  const neighborhoods = neighborhoodsParam
    ? neighborhoodsParam.split(',').filter(Boolean)
    : singleNeighborhood
      ? [singleNeighborhood]
      : undefined

  // Parse map area bounds if provided
  const boundsParam = searchParams.get('bounds')
  let bounds: { ne: { lat: number; lng: number }; sw: { lat: number; lng: number } } | undefined
  if (boundsParam) {
    try {
      bounds = JSON.parse(boundsParam)
    } catch {
      console.error('Failed to parse bounds param:', boundsParam)
    }
  }

  const sourcesParam = searchParams.get('sources')

  // Parse sources from query param or use defaults
  const sources: DiscoverySource[] = sourcesParam
    ? sourcesParam.split(',') as DiscoverySource[]
    : ['google_places', 'exa']

  // Create streaming response
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Logger callback that sends SSE events
        const logger = (event: DiscoveryLogEvent) => {
          sendEvent(controller, 'log', {
            message: event.message,
            level: event.level,
          })
        }

        // Discovery with logging - the discovery function logs what it's actually searching
        const restaurants = await discoverRestaurants({
          city,
          neighborhoods,
          bounds,
          cuisine,
          partySize,
          sources,
          limit: 30,
          logger,
        })

        if (restaurants.length === 0) {
          sendEvent(controller, 'complete', { count: 0 })
          controller.close()
          return
        }

        // Stream results to client
        for (const restaurant of restaurants) {
          sendEvent(controller, 'venue', { data: restaurantToLegacyFormat(restaurant) })
          await sleep(100) // Small delay for visual effect
        }

        sendEvent(controller, 'complete', {
          count: restaurants.length,
          venues: restaurants.map(restaurantToLegacyFormat),
        })

        controller.close()
      } catch (err) {
        console.error('Discovery error:', err)
        sendEvent(controller, 'error', {
          message: 'Discovery failed. Please try again.',
        })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Convert new restaurant format to legacy venue format for UI compatibility
 */
function restaurantToLegacyFormat(restaurant: DiscoveredRestaurant): Record<string, unknown> {
  return {
    name: restaurant.name,
    category: restaurant.category,
    email: restaurant.email,
    city: restaurant.city,
    neighborhood: restaurant.neighborhood,
    venueTypes: ['restaurant'],
    capacityMin: restaurant.capacityMin,
    capacityMax: restaurant.capacityMax,
    pricePerPersonMin: restaurant.pricePerPersonMin,
    pricePerPersonMax: restaurant.pricePerPersonMax,
    indoorOutdoor: 'both',
    catering: {
      food: true,
      drinks: true,
      externalAllowed: false,
    },
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
    googlePlaceId: restaurant.googlePlaceId,
    emailConfidence: restaurant.emailConfidence,
    discoverySource: restaurant.discoverySource,
    website: restaurant.website,
    rating: restaurant.rating,
    phone: restaurant.phone,
    // Restaurant-specific fields
    cuisine: restaurant.cuisine,
    priceLevel: restaurant.priceLevel,
    hasPrivateDining: restaurant.hasPrivateDining,
    privateDiningCapacityMin: restaurant.privateDiningCapacityMin,
    privateDiningCapacityMax: restaurant.privateDiningCapacityMax,
    privateDiningMinimum: restaurant.privateDiningMinimum,
    resyVenueId: restaurant.resyVenueId,
    opentableId: restaurant.opentableId,
    beliRank: restaurant.beliRank,
  }
}
