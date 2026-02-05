/**
 * Entity Enrichment Module
 * Centralized logic for enriching entities with Google Places data
 */

import { createClient } from '@/lib/supabase/server'
import { enrichVenueFromGooglePlaces } from '@/lib/discovery/google-places'
import { Entity, EntityMetadata } from '@/types/database'

// ============================================================================
// Types
// ============================================================================

export interface EnrichmentResult {
  success: boolean
  entity?: Entity
  enrichedFields?: {
    website?: string
    phone?: string
    rating?: number
    priceLevel?: number
    googlePlaceId?: string
  }
  error?: string
  alreadyEnriched?: boolean
}

// ============================================================================
// Core Enrichment Function
// ============================================================================

/**
 * Enrich a single entity with Google Places data
 * This is the single source of truth for enrichment logic
 */
export async function enrichEntityCore(entityId: string): Promise<EnrichmentResult> {
  const supabase = await createClient()

  // Fetch entity
  const { data: entity, error: fetchError } = await supabase
    .from('entities')
    .select('*')
    .eq('id', entityId)
    .single()

  if (fetchError || !entity) {
    return { success: false, error: 'Entity not found' }
  }

  return enrichEntityWithData(entity as Entity)
}

/**
 * Enrich an already-fetched entity
 * Used by bulk enrichment to avoid re-fetching
 */
export async function enrichEntityWithData(entity: Entity): Promise<EnrichmentResult> {
  const supabase = await createClient()
  const metadata = entity.metadata as EntityMetadata

  // Check if already enriched
  if (metadata?.google_place_id) {
    return {
      success: true,
      alreadyEnriched: true,
      entity,
    }
  }

  // Call Google Places API
  const enriched = await enrichVenueFromGooglePlaces(
    entity.name,
    entity.address || undefined,
    entity.city || 'New York'
  )

  if (!enriched) {
    // Mark as attempted to avoid retrying
    await markEnrichmentAttempted(entity.id, metadata)
    return {
      success: false,
      error: 'No matching venue found in Google Places',
    }
  }

  // Build update data
  const { updateData, enrichedFields } = buildEnrichmentUpdate(entity, metadata, enriched)

  // Update entity
  const { data: updated, error: updateError } = await supabase
    .from('entities')
    .update(updateData)
    .eq('id', entity.id)
    .select()
    .single()

  if (updateError) {
    return { success: false, error: 'Failed to update entity' }
  }

  return {
    success: true,
    entity: updated as Entity,
    enrichedFields,
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Mark an entity as having been attempted for enrichment (but not found)
 */
async function markEnrichmentAttempted(
  entityId: string,
  existingMetadata?: EntityMetadata
): Promise<void> {
  const supabase = await createClient()

  const updatedMetadata: EntityMetadata = {
    ...existingMetadata,
    enrichment_attempted: true,
    enrichment_attempted_at: new Date().toISOString(),
  }

  await supabase
    .from('entities')
    .update({ metadata: updatedMetadata })
    .eq('id', entityId)
}

/**
 * Build the update data object from enrichment results
 */
function buildEnrichmentUpdate(
  entity: Entity,
  metadata: EntityMetadata | undefined,
  enriched: NonNullable<Awaited<ReturnType<typeof enrichVenueFromGooglePlaces>>>
): {
  updateData: Partial<Entity>
  enrichedFields: EnrichmentResult['enrichedFields']
} {
  const updatedMetadata: EntityMetadata = {
    ...metadata,
    google_place_id: enriched.googlePlaceId,
    phone: enriched.phone || metadata?.phone,
    rating: enriched.rating || metadata?.rating,
    price_level: enriched.priceLevel || metadata?.price_level,
    enriched_at: new Date().toISOString(),
  }

  const updateData: Partial<Entity> = {
    website: enriched.website || entity.website,
    metadata: updatedMetadata,
  }

  // Update coordinates if missing
  if (!entity.latitude && enriched.latitude) {
    updateData.latitude = enriched.latitude
    updateData.longitude = enriched.longitude
  }

  const enrichedFields = {
    website: enriched.website,
    phone: enriched.phone,
    rating: enriched.rating,
    priceLevel: enriched.priceLevel,
    googlePlaceId: enriched.googlePlaceId,
  }

  return { updateData, enrichedFields }
}

// ============================================================================
// Batch Helpers
// ============================================================================

/**
 * Get entities that need enrichment
 */
export async function getEntitiesNeedingEnrichment(limit: number = 1000): Promise<Entity[]> {
  const supabase = await createClient()

  const { data: entities } = await supabase
    .from('entities')
    .select('*')
    .is('metadata->google_place_id', null)
    .is('metadata->enrichment_attempted', null)
    .limit(limit)

  return (entities || []) as Entity[]
}

/**
 * Get enrichment statistics
 */
export async function getEnrichmentStats(): Promise<{
  total: number
  enriched: number
  attempted: number
  pending: number
}> {
  const supabase = await createClient()

  const { count: totalCount } = await supabase
    .from('entities')
    .select('*', { count: 'exact', head: true })

  const { count: enrichedCount } = await supabase
    .from('entities')
    .select('*', { count: 'exact', head: true })
    .not('metadata->google_place_id', 'is', null)

  const { count: attemptedCount } = await supabase
    .from('entities')
    .select('*', { count: 'exact', head: true })
    .eq('metadata->enrichment_attempted', true)

  const total = totalCount || 0
  const enriched = enrichedCount || 0
  const attempted = attemptedCount || 0
  const pending = total - enriched - attempted

  return { total, enriched, attempted, pending }
}
