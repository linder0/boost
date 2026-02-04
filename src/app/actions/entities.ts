'use server'

import {
  getAuthenticatedClient,
  verifyEventOwnership,
  handleSupabaseError,
  ensureFound
} from '@/lib/supabase/server'
import { Entity, EntityWithStatus, Event, EntityMetadata, DiscoverySource } from '@/types/database'
import { DisplayEntity, toEntity, toDisplayEntity, calculatePopularity } from '@/types/entities'
import { revalidatePath } from 'next/cache'
import { validateUUID } from '@/lib/utils'
import { findMatchingRestaurants, DemoRestaurant } from '@/lib/demo/restaurants'
import { discoverRestaurants, DiscoveredRestaurant } from '@/lib/discovery'

// ============================================================================
// Entity CRUD Operations
// ============================================================================

/**
 * Create a new entity in the VRM
 */
export async function createEntity(data: {
  name: string
  tags: string[]
  location?: string
  description?: string
  website?: string
  metadata?: EntityMetadata
}) {
  const { supabase } = await getAuthenticatedClient()

  const { data: entity, error } = await supabase
    .from('entities')
    .insert({
      name: data.name,
      tags: data.tags,
      location: data.location || null,
      description: data.description || null,
      website: data.website || null,
      popularity: calculatePopularity(data.metadata?.rating, data.metadata?.review_count),
      metadata: data.metadata || {},
    })
    .select()
    .single()

  return ensureFound(entity, error, 'Failed to create entity') as Entity
}

/**
 * Get an entity by ID
 */
export async function getEntity(entityId: string) {
  validateUUID(entityId, 'entity ID')

  const { supabase } = await getAuthenticatedClient()

  const { data: entity, error } = await supabase
    .from('entities')
    .select('*')
    .eq('id', entityId)
    .single()

  return ensureFound(entity, error, 'Entity not found') as Entity
}

/**
 * Update an entity
 */
export async function updateEntity(
  entityId: string,
  data: Partial<{
    name: string
    tags: string[]
    location: string
    description: string
    website: string
    metadata: EntityMetadata
  }>
) {
  const { supabase } = await getAuthenticatedClient()

  const updateData: Record<string, unknown> = { ...data }

  // Recalculate popularity if rating/reviews changed
  if (data.metadata?.rating !== undefined) {
    updateData.popularity = calculatePopularity(
      data.metadata.rating,
      data.metadata.review_count
    )
  }

  const { data: entity, error } = await supabase
    .from('entities')
    .update(updateData)
    .eq('id', entityId)
    .select()
    .single()

  return ensureFound(entity, error, 'Failed to update entity') as Entity
}

/**
 * Delete an entity
 */
export async function deleteEntity(entityId: string) {
  const { supabase } = await getAuthenticatedClient()

  const { error } = await supabase.from('entities').delete().eq('id', entityId)
  handleSupabaseError(error, 'Failed to delete entity')

  return { success: true }
}

// ============================================================================
// Event-Entity Operations
// ============================================================================

/**
 * Add an entity to an event
 */
export async function addEntityToEvent(
  eventId: string,
  entityId: string,
  options?: { status?: string; notes?: string }
) {
  const { supabase, user } = await getAuthenticatedClient()

  await verifyEventOwnership(supabase, eventId, user.id)

  const { data, error } = await supabase
    .from('event_entities')
    .insert({
      event_id: eventId,
      entity_id: entityId,
      status: options?.status || 'discovered',
      notes: options?.notes || null,
    })
    .select()
    .single()

  handleSupabaseError(error, 'Failed to add entity to event')
  revalidatePath(`/events/${eventId}/vendors`)

  return data
}

/**
 * Remove an entity from an event
 */
export async function removeEntityFromEvent(eventId: string, entityId: string) {
  const { supabase, user } = await getAuthenticatedClient()

  await verifyEventOwnership(supabase, eventId, user.id)

  const { error } = await supabase
    .from('event_entities')
    .delete()
    .eq('event_id', eventId)
    .eq('entity_id', entityId)

  handleSupabaseError(error, 'Failed to remove entity from event')
  revalidatePath(`/events/${eventId}/vendors`)

  return { success: true }
}

/**
 * Get all entities for an event
 */
export async function getEntitiesByEvent(eventId: string): Promise<EntityWithStatus[]> {
  validateUUID(eventId, 'event ID')

  const { supabase } = await getAuthenticatedClient()

  const { data, error } = await supabase
    .from('entities')
    .select(`
      *,
      event_entity:event_entities!inner(*)
    `)
    .eq('event_entities.event_id', eventId)
    .order('created_at', { ascending: false })

  handleSupabaseError(error, 'Failed to fetch entities')

  return (data ?? []).map((row: Entity & { event_entity: unknown }) => ({
    ...row,
    event_entity: row.event_entity as EntityWithStatus['event_entity'],
  })) as EntityWithStatus[]
}

/**
 * Update entity status for an event
 */
export async function updateEventEntityStatus(
  eventId: string,
  entityId: string,
  status: string
) {
  const { supabase, user } = await getAuthenticatedClient()

  await verifyEventOwnership(supabase, eventId, user.id)

  const { error } = await supabase
    .from('event_entities')
    .update({ status })
    .eq('event_id', eventId)
    .eq('entity_id', entityId)

  handleSupabaseError(error, 'Failed to update entity status')
  revalidatePath(`/events/${eventId}/vendors`)

  return { success: true }
}

/**
 * Bulk delete entities from an event
 */
export async function bulkRemoveEntitiesFromEvent(eventId: string, entityIds: string[]) {
  if (entityIds.length === 0) {
    return { success: true, count: 0 }
  }

  const { supabase, user } = await getAuthenticatedClient()
  await verifyEventOwnership(supabase, eventId, user.id)

  const { error } = await supabase
    .from('event_entities')
    .delete()
    .eq('event_id', eventId)
    .in('entity_id', entityIds)

  handleSupabaseError(error, 'Failed to remove entities')
  revalidatePath(`/events/${eventId}/vendors`)

  return { success: true, count: entityIds.length }
}

// ============================================================================
// Discovery Operations
// ============================================================================

/**
 * Input type for creating entities from discovery
 */
export interface DiscoveredEntityInput {
  name: string
  tags?: string[]
  location?: string
  website?: string
  email?: string
  phone?: string
  latitude?: number
  longitude?: number
  neighborhood?: string
  city?: string
  // Discovery
  discoverySource?: DiscoverySource
  googlePlaceId?: string
  rating?: number
  reviewCount?: number
  emailConfidence?: number
  // Restaurant-specific
  cuisine?: string
  priceLevel?: number
  hasPrivateDining?: boolean
  privateDiningCapacityMin?: number
  privateDiningCapacityMax?: number
  privateDiningMinimum?: number
  resyVenueId?: string
  opentableId?: string
  beliRank?: number
}

/**
 * Discover restaurants for an event
 */
export async function discoverRestaurantsForEvent(eventId: string): Promise<{
  restaurants: (DemoRestaurant | DiscoveredRestaurant)[]
  event: { city: string; headcount: number; budget: number }
  source: 'google_places' | 'resy' | 'demo'
}> {
  validateUUID(eventId, 'event ID')

  const { supabase, user } = await getAuthenticatedClient()

  const event = await verifyEventOwnership(supabase, eventId, user.id)

  // Try real discovery first (Google Places + Resy)
  const hasGooglePlacesKey = !!process.env.GOOGLE_PLACES_API_KEY

  if (hasGooglePlacesKey) {
    try {
      const discoveredRestaurants = await discoverRestaurants({
        city: event.city || 'New York',
        neighborhood: event.constraints?.neighborhood,
        partySize: event.headcount,
        sources: ['google_places', 'resy'],
        limit: 30,
      })

      if (discoveredRestaurants.length > 0) {
        return {
          restaurants: discoveredRestaurants,
          event: {
            city: event.city || 'New York',
            headcount: event.headcount,
            budget: event.total_budget,
          },
          source: 'google_places',
        }
      }
    } catch (error) {
      console.error('Real discovery failed, falling back to demo data:', error)
    }
  }

  // Fallback to demo restaurants
  const restaurants = findMatchingRestaurants({
    headcount: event.headcount,
    budget: event.total_budget || event.venue_budget_ceiling,
    neighborhood: event.constraints?.neighborhood,
    requiresPrivateDining: event.constraints?.requires_private_dining,
  })

  return {
    restaurants,
    event: {
      city: event.city || 'New York',
      headcount: event.headcount,
      budget: event.total_budget,
    },
    source: 'demo',
  }
}

/**
 * Create entities from discovered venues and add to event
 */
export async function createEntitiesFromDiscovery(
  eventId: string,
  discoveries: DiscoveredEntityInput[]
): Promise<Entity[]> {
  if (discoveries.length === 0) {
    throw new Error('No venues selected')
  }

  const { supabase, user } = await getAuthenticatedClient()

  await verifyEventOwnership(supabase, eventId, user.id)

  // Check for existing entities by Google Place ID or name to avoid duplicates
  const googlePlaceIds = discoveries
    .map(d => d.googlePlaceId)
    .filter((id): id is string => !!id)

  const names = discoveries.map(d => d.name.toLowerCase())

  const { data: existingEntities } = await supabase
    .from('entities')
    .select('id, name, metadata')
    .or(`metadata->google_place_id.in.(${googlePlaceIds.join(',')}),name.ilike.any({${names.join(',')}})`)

  // Build lookup sets
  const existingPlaceIds = new Set(
    (existingEntities ?? [])
      .map((e: { metadata: EntityMetadata }) => e.metadata?.google_place_id)
      .filter(Boolean)
  )
  const existingNames = new Set(
    (existingEntities ?? []).map((e: { name: string }) => e.name.toLowerCase())
  )

  // Separate new vs existing
  const newDiscoveries: DiscoveredEntityInput[] = []
  const existingIds: string[] = []

  for (const d of discoveries) {
    const isExisting = (d.googlePlaceId && existingPlaceIds.has(d.googlePlaceId)) ||
      existingNames.has(d.name.toLowerCase())

    if (isExisting) {
      const existing = (existingEntities ?? []).find((e: { name: string; metadata: EntityMetadata }) =>
        e.metadata?.google_place_id === d.googlePlaceId ||
        e.name.toLowerCase() === d.name.toLowerCase()
      )
      if (existing) {
        existingIds.push(existing.id)
      }
    } else {
      newDiscoveries.push(d)
    }
  }

  // Create new entities
  const createdEntities: Entity[] = []

  if (newDiscoveries.length > 0) {
    const entitiesToInsert = newDiscoveries.map(d => {
      const metadata: EntityMetadata = {
        email: d.email,
        phone: d.phone,
        latitude: d.latitude,
        longitude: d.longitude,
        neighborhood: d.neighborhood,
        city: d.city,
        discovery_source: d.discoverySource,
        google_place_id: d.googlePlaceId,
        rating: d.rating,
        review_count: d.reviewCount,
        email_confidence: d.emailConfidence,
        cuisine: d.cuisine,
        price_level: d.priceLevel,
        has_private_dining: d.hasPrivateDining,
        private_dining_capacity_min: d.privateDiningCapacityMin,
        private_dining_capacity_max: d.privateDiningCapacityMax,
        private_dining_minimum: d.privateDiningMinimum,
        resy_venue_id: d.resyVenueId,
        opentable_id: d.opentableId,
        beli_rank: d.beliRank,
      }

      // Clean undefined values
      Object.keys(metadata).forEach(key => {
        if (metadata[key as keyof EntityMetadata] === undefined) {
          delete metadata[key as keyof EntityMetadata]
        }
      })

      return {
        name: d.name,
        tags: d.tags || ['restaurant'],
        location: d.location || d.neighborhood || d.city || null,
        website: d.website || null,
        popularity: calculatePopularity(d.rating, d.reviewCount),
        metadata,
      }
    })

    const { data: created, error } = await supabase
      .from('entities')
      .insert(entitiesToInsert)
      .select()

    handleSupabaseError(error, 'Failed to create entities')
    createdEntities.push(...(created ?? []))
  }

  // Link all entities (new + existing) to the event
  const allEntityIds = [
    ...createdEntities.map(e => e.id),
    ...existingIds,
  ]

  if (allEntityIds.length > 0) {
    const eventEntities = allEntityIds.map(entityId => ({
      event_id: eventId,
      entity_id: entityId,
      status: 'discovered',
    }))

    // Use upsert to handle duplicates gracefully
    const { error: linkError } = await supabase
      .from('event_entities')
      .upsert(eventEntities, { onConflict: 'event_id,entity_id' })

    handleSupabaseError(linkError, 'Failed to link entities to event')
  }

  revalidatePath(`/events/${eventId}/vendors`)

  return createdEntities
}

// ============================================================================
// Legacy Compatibility (for gradual migration)
// ============================================================================

/** @deprecated Use getEntitiesByEvent instead */
export async function getVendorsByEvent(eventId: string) {
  return getEntitiesByEvent(eventId)
}

/** @deprecated Use createEntitiesFromDiscovery instead */
export async function createVendorsFromDiscovery(
  eventId: string,
  selectedVenues: DiscoveredEntityInput[]
) {
  return createEntitiesFromDiscovery(eventId, selectedVenues)
}

/** @deprecated Use bulkRemoveEntitiesFromEvent instead */
export async function bulkDeleteVendors(vendorIds: string[], eventId: string) {
  return bulkRemoveEntitiesFromEvent(eventId, vendorIds)
}
