import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { NYCRestaurantEntity } from '@/lib/discovery/nyc-open-data'

// Batch size for database inserts
const BATCH_SIZE = 500

// Helper to send SSE events
function sendEvent(
  controller: ReadableStreamDefaultController,
  type: string,
  data: Record<string, unknown>
) {
  const event = JSON.stringify({ type, ...data })
  controller.enqueue(new TextEncoder().encode(`data: ${event}\n\n`))
}

/**
 * POST /api/import/nyc-restaurants
 * Bulk import NYC restaurants with SSE progress updates
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const restaurants: NYCRestaurantEntity[] = body.restaurants

    if (!restaurants || !Array.isArray(restaurants) || restaurants.length === 0) {
      return new Response(JSON.stringify({ error: 'No restaurants provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const stream = new ReadableStream({
      async start(controller) {
        const supabase = await createClient()

        let imported = 0
        let skipped = 0
        let errors = 0
        const totalBatches = Math.ceil(restaurants.length / BATCH_SIZE)

        sendEvent(controller, 'start', {
          total: restaurants.length,
          batches: totalBatches,
        })

        // First, get all existing CAMIS IDs to skip duplicates
        sendEvent(controller, 'log', { message: 'Checking for existing restaurants...' })

        const camisIds = restaurants.map(r => r.metadata.camis)

        // Check in batches to avoid query size limits
        const existingCamis = new Set<string>()
        for (let i = 0; i < camisIds.length; i += 1000) {
          const batch = camisIds.slice(i, i + 1000)
          const { data: existing } = await supabase
            .from('entities')
            .select('metadata')
            .filter('metadata->>camis', 'in', `(${batch.join(',')})`)

          if (existing) {
            for (const e of existing) {
              const camis = (e.metadata as Record<string, unknown>)?.camis
              if (camis) existingCamis.add(String(camis))
            }
          }
        }

        sendEvent(controller, 'log', {
          message: `Found ${existingCamis.size} existing restaurants to skip`
        })

        // Filter out existing restaurants
        const newRestaurants = restaurants.filter(
          r => !existingCamis.has(r.metadata.camis)
        )
        skipped = restaurants.length - newRestaurants.length

        if (newRestaurants.length === 0) {
          sendEvent(controller, 'complete', {
            imported: 0,
            skipped,
            errors: 0,
            message: 'All restaurants already exist in database',
          })
          controller.close()
          return
        }

        sendEvent(controller, 'log', {
          message: `Importing ${newRestaurants.length} new restaurants...`
        })

        // Process in batches
        const newBatches = Math.ceil(newRestaurants.length / BATCH_SIZE)

        for (let batchNum = 0; batchNum < newBatches; batchNum++) {
          const start = batchNum * BATCH_SIZE
          const end = Math.min(start + BATCH_SIZE, newRestaurants.length)
          const batch = newRestaurants.slice(start, end)

          try {
            // Transform to database format
            const entitiesToInsert = batch.map(r => ({
              name: r.name,
              tags: r.tags,
              address: r.address || null,
              neighborhood: r.neighborhood || null,
              city: r.city,
              latitude: r.latitude,
              longitude: r.longitude,
              location: r.address ? `${r.address}, ${r.city}` : r.city,
              website: null,
              popularity: 0,
              metadata: r.metadata,
            }))

            const { error } = await supabase
              .from('entities')
              .insert(entitiesToInsert)

            if (error) {
              console.error('Batch insert error:', error)
              errors += batch.length
              sendEvent(controller, 'batch_error', {
                batch: batchNum + 1,
                error: error.message,
              })
            } else {
              imported += batch.length
              sendEvent(controller, 'progress', {
                batch: batchNum + 1,
                totalBatches: newBatches,
                imported,
                skipped,
                errors,
                percent: Math.round(((batchNum + 1) / newBatches) * 100),
              })
            }
          } catch (err) {
            console.error('Batch processing error:', err)
            errors += batch.length
            sendEvent(controller, 'batch_error', {
              batch: batchNum + 1,
              error: err instanceof Error ? err.message : 'Unknown error',
            })
          }

          // Small delay between batches to avoid overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        sendEvent(controller, 'complete', {
          imported,
          skipped,
          errors,
          message: `Successfully imported ${imported} restaurants`,
        })

        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    console.error('Import error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Import failed' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

/**
 * GET /api/import/nyc-restaurants/stats
 * Get current import statistics
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Count NYC Open Data restaurants
    const { count, error } = await supabase
      .from('entities')
      .select('*', { count: 'exact', head: true })
      .eq('metadata->>discovery_source', 'nyc_open_data')

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({
        nycOpenDataCount: count || 0,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    console.error('Stats error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to get stats' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
