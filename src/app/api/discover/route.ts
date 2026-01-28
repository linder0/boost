import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchVenues } from '@/lib/discovery/google-places'
import { findEmail } from '@/lib/discovery/hunter'
import { DiscoveredVenue } from '@/lib/discovery'

// Helper to send SSE events
function sendEvent(
  controller: ReadableStreamDefaultController,
  type: string,
  data: Record<string, unknown>
) {
  const event = JSON.stringify({ type, ...data })
  controller.enqueue(new TextEncoder().encode(`data: ${event}\n\n`))
}

// Estimate price range from Google's price level
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
  const parts = address.split(',').map((p) => p.trim())
  if (parts.length >= 3) {
    return parts[1]
  }
  return undefined
}

// Generate placeholder email
function generatePlaceholderEmail(venueName: string): string {
  const slug = venueName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 20)
  return `events@${slug}.com`
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const eventId = searchParams.get('eventId')

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

  // Create streaming response
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Get venue types from event, add default vendor types
        const venueTypes = event.constraints?.venue_types || ['restaurant', 'bar', 'rooftop']
        const vendorTypes = event.constraints?.vendor_types || ['caterer', 'photographer']
        const allSearchTypes = [...venueTypes, ...vendorTypes]

        // Step 1: Log start
        sendEvent(controller, 'log', {
          message: `Starting discovery for ${event.name}...`,
        })
        await sleep(300)

        // Step 2: Search Google Places for venues
        sendEvent(controller, 'log', {
          message: `Searching for venues: ${venueTypes.join(', ')}...`,
        })
        await sleep(200)

        sendEvent(controller, 'log', {
          message: `Searching for vendors: ${vendorTypes.join(', ')}...`,
        })

        const googleVenues = await searchVenues(event.city, allSearchTypes, 25)

        if (googleVenues.length === 0) {
          sendEvent(controller, 'log', {
            message: 'No results found from Google Places',
            level: 'warn',
          })
          sendEvent(controller, 'complete', { count: 0 })
          controller.close()
          return
        }

        // Count venues vs vendors
        const venueCount = googleVenues.filter((v) => v.category === 'Venue').length
        const vendorCount = googleVenues.filter((v) => v.category !== 'Venue').length

        sendEvent(controller, 'log', {
          message: `Found ${venueCount} venues and ${vendorCount} vendors`,
          level: 'success',
        })
        await sleep(200)

        // Step 3: Stream results as they're discovered
        const discoveredVenues: DiscoveredVenue[] = []

        for (const venue of googleVenues) {
          const priceRange = estimatePriceRange(venue.priceLevel)

          const baseVenue: DiscoveredVenue = {
            name: venue.name,
            category: venue.category, // Use category from Google Places search
            email: generatePlaceholderEmail(venue.name),
            city: event.city,
            neighborhood: extractNeighborhood(venue.address),
            venueTypes: [venue.searchType], // Use the search type
            capacityMin: venue.category === 'Venue' ? 20 : 0,
            capacityMax: venue.category === 'Venue' ? 150 : 0,
            pricePerPersonMin: priceRange.min,
            pricePerPersonMax: priceRange.max,
            indoorOutdoor: 'both' as const,
            catering: {
              food: venue.category === 'Venue' || venue.category === 'Caterer',
              drinks: venue.category === 'Venue',
              externalAllowed: false,
            },
            latitude: venue.latitude,
            longitude: venue.longitude,
            googlePlaceId: venue.googlePlaceId,
            discoverySource: 'google_places',
            website: venue.website,
            rating: venue.rating,
          }

          discoveredVenues.push(baseVenue)

          // Stream the venue/vendor immediately
          sendEvent(controller, 'venue', { data: baseVenue })
          await sleep(100) // Small delay for visual effect
        }

        // Step 4: Enrich with emails
        sendEvent(controller, 'log', {
          message: 'Looking up contact emails via Hunter.io...',
        })
        await sleep(300)

        const venuesWithWebsites = googleVenues.filter((v) => v.website)
        let emailsFound = 0

        for (let i = 0; i < venuesWithWebsites.length; i++) {
          const venue = venuesWithWebsites[i]
          const discoveredVenue = discoveredVenues.find(
            (v) => v.googlePlaceId === venue.googlePlaceId
          )

          if (!discoveredVenue || !venue.website) continue

          try {
            const emailResult = await findEmail(venue.website)

            if (emailResult) {
              discoveredVenue.email = emailResult.email
              discoveredVenue.emailConfidence = emailResult.confidence
              emailsFound++

              sendEvent(controller, 'venue_updated', {
                data: discoveredVenue,
              })

              sendEvent(controller, 'log', {
                message: `✓ ${venue.name} - ${emailResult.email} (${emailResult.confidence}% confidence)`,
                level: 'success',
              })
            }
          } catch (err) {
            // Silently continue if email lookup fails
          }

          // Small delay between Hunter requests
          if (i < venuesWithWebsites.length - 1) {
            await sleep(150)
          }
        }

        // Step 5: Complete
        const finalVenueCount = discoveredVenues.filter((v) => v.category === 'Venue').length
        const finalVendorCount = discoveredVenues.filter((v) => v.category !== 'Venue').length
        
        sendEvent(controller, 'log', {
          message: `Discovery complete! Found ${finalVenueCount} venues, ${finalVendorCount} vendors, ${emailsFound} verified emails`,
          level: 'success',
        })

        sendEvent(controller, 'complete', {
          count: discoveredVenues.length,
          venues: discoveredVenues,
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
