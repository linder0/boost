import { NextRequest } from 'next/server'
import {
  enrichEntityWithData,
  getEntitiesNeedingEnrichment,
  getEnrichmentStats,
} from '@/lib/enrichment'

// Batch size for processing
const BATCH_SIZE = 10
// Delay between items (ms) for rate limiting
const ITEM_DELAY = 500
// Delay between batches (ms)
const BATCH_DELAY = 2000

// Helper to send SSE events
function sendEvent(
  controller: ReadableStreamDefaultController,
  type: string,
  data: Record<string, unknown>
) {
  const event = JSON.stringify({ type, ...data })
  controller.enqueue(new TextEncoder().encode(`data: ${event}\n\n`))
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * POST /api/enrich/bulk
 * Bulk enrich entities missing Google Place ID
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const limit = body.limit || 1000

  const stream = new ReadableStream({
    async start(controller) {
      sendEvent(controller, 'log', { message: 'Finding entities that need enrichment...' })

      const entities = await getEntitiesNeedingEnrichment(limit)

      if (entities.length === 0) {
        sendEvent(controller, 'complete', {
          enriched: 0,
          failed: 0,
          total: 0,
          message: 'No entities need enrichment',
        })
        controller.close()
        return
      }

      sendEvent(controller, 'start', {
        total: entities.length,
        message: `Found ${entities.length} entities to enrich`,
      })

      let enriched = 0
      let failed = 0
      const totalBatches = Math.ceil(entities.length / BATCH_SIZE)

      for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
        const start = batchNum * BATCH_SIZE
        const end = Math.min(start + BATCH_SIZE, entities.length)
        const batch = entities.slice(start, end)

        for (const entity of batch) {
          try {
            const result = await enrichEntityWithData(entity)

            if (result.success && !result.alreadyEnriched) {
              enriched++
              sendEvent(controller, 'enriched', {
                entityId: entity.id,
                name: entity.name,
                enriched,
                failed,
              })
            } else if (!result.success) {
              failed++
              sendEvent(controller, 'not_found', {
                entityId: entity.id,
                name: entity.name,
                enriched,
                failed,
              })
            }
          } catch (err) {
            console.error(`Error enriching ${entity.name}:`, err)
            failed++
            sendEvent(controller, 'error_item', {
              entityId: entity.id,
              name: entity.name,
              error: err instanceof Error ? err.message : 'Unknown error',
              enriched,
              failed,
            })
          }

          await sleep(ITEM_DELAY)
        }

        // Progress update after batch
        const percent = Math.round(((batchNum + 1) / totalBatches) * 100)
        sendEvent(controller, 'progress', {
          batch: batchNum + 1,
          totalBatches,
          enriched,
          failed,
          percent,
          processed: end,
          total: entities.length,
        })

        if (batchNum < totalBatches - 1) {
          await sleep(BATCH_DELAY)
        }
      }

      sendEvent(controller, 'complete', {
        enriched,
        failed,
        total: entities.length,
        message: `Enriched ${enriched} entities, ${failed} not found`,
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
}

/**
 * GET /api/enrich/bulk
 * Get enrichment statistics
 */
export async function GET() {
  try {
    const stats = await getEnrichmentStats()
    return new Response(JSON.stringify(stats), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Stats error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to get stats' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
