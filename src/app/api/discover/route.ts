import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  discoverRestaurants,
  DiscoveredRestaurant,
  DiscoverySource,
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
  const eventId = searchParams.get('eventId')
  const cuisine = searchParams.get('cuisine') || undefined
  // Support both single 'neighborhood' and multiple 'neighborhoods' params
  const neighborhoodsParam = searchParams.get('neighborhoods')
  const singleNeighborhood = searchParams.get('neighborhood')
  const neighborhoods = neighborhoodsParam
    ? neighborhoodsParam.split(',').filter(Boolean)
    : singleNeighborhood
      ? [singleNeighborhood]
      : undefined
  const sourcesParam = searchParams.get('sources')

  if (!eventId) {
    return new Response('Missing eventId', { status: 400 })
  }

  // Verify user is authenticated and owns the event
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .eq('user_id', user.id)
    .single()

  if (error || !event) {
    return new Response('Event not found', { status: 404 })
  }

  // Parse sources from query param or use defaults
  const sources: DiscoverySource[] = sourcesParam
    ? sourcesParam.split(',') as DiscoverySource[]
    : ['google_places', 'resy']

  // Create streaming response
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Step 1: Log start
        sendEvent(controller, 'log', {
          message: `Starting restaurant discovery for ${event.name}...`,
        })
        await sleep(300)

        // Step 2: Log sources
        const sourceLabels = sources.map((s) => {
          switch (s) {
            case 'google_places': return 'Google Places'
            case 'resy': return 'Resy'
            case 'opentable': return 'OpenTable'
            case 'beli': return 'Beli'
            default: return s
          }
        })
        sendEvent(controller, 'log', {
          message: `Searching: ${sourceLabels.join(', ')}...`,
        })
        await sleep(200)

        // Step 3: Discover restaurants
        // Use provided neighborhoods or fall back to event constraints
        const searchNeighborhoods = neighborhoods?.length
          ? neighborhoods
          : event.constraints?.neighborhood
            ? [event.constraints.neighborhood]
            : undefined

        // Log which neighborhoods we're searching
        if (searchNeighborhoods?.length) {
          sendEvent(controller, 'log', {
            message: `Searching in: ${searchNeighborhoods.join(', ')}`,
          })
          await sleep(200)
        }

        const restaurants = await discoverRestaurants({
          city: event.city || 'New York',
          neighborhoods: searchNeighborhoods,
          cuisine,
          partySize: event.headcount,
          sources,
          limit: 30,
        })

        if (restaurants.length === 0) {
          sendEvent(controller, 'log', {
            message: 'No restaurants found. Try adjusting your search criteria.',
            level: 'warn',
          })
          sendEvent(controller, 'complete', { count: 0 })
          controller.close()
          return
        }

        sendEvent(controller, 'log', {
          message: `Found ${restaurants.length} restaurants`,
          level: 'success',
        })
        await sleep(200)

        // Step 4: Stream results
        const discoveredRestaurants: DiscoveredRestaurant[] = []

        for (const restaurant of restaurants) {
          discoveredRestaurants.push(restaurant)

          // Stream the restaurant immediately
          sendEvent(controller, 'venue', { data: restaurantToLegacyFormat(restaurant) })
          await sleep(100) // Small delay for visual effect
        }

        // Step 5: Summary by source
        const bySource = restaurants.reduce((acc, r) => {
          acc[r.discoverySource] = (acc[r.discoverySource] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        const sourceSummary = Object.entries(bySource)
          .map(([source, count]) => `${count} from ${source}`)
          .join(', ')

        const withPrivateDining = restaurants.filter((r) => r.hasPrivateDining).length
        const withEmails = restaurants.filter((r) => r.email && !r.email.includes('@placeholder.')).length

        sendEvent(controller, 'log', {
          message: `Discovery complete! ${sourceSummary}`,
          level: 'success',
        })

        if (withPrivateDining > 0) {
          sendEvent(controller, 'log', {
            message: `${withPrivateDining} with verified private dining`,
            level: 'info',
          })
        }

        if (withEmails > 0) {
          sendEvent(controller, 'log', {
            message: `${withEmails} with verified contact emails`,
            level: 'info',
          })
        }

        sendEvent(controller, 'complete', {
          count: discoveredRestaurants.length,
          venues: discoveredRestaurants.map(restaurantToLegacyFormat),
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
