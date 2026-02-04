'use server'

import {
  createClient,
  handleSupabaseError,
  ensureFound
} from '@/lib/supabase/server'
import { Entity, EntityMetadata, DiscoverySource } from '@/types/database'
import { calculatePopularity } from '@/types/entities'
import { revalidatePath } from 'next/cache'
import { validateUUID } from '@/lib/utils'

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
  const supabase = await createClient()

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

  const supabase = await createClient()

  const { data: entity, error } = await supabase
    .from('entities')
    .select('*')
    .eq('id', entityId)
    .single()

  return ensureFound(entity, error, 'Entity not found') as Entity
}

/**
 * Get all entities
 */
export async function getAllEntities(): Promise<Entity[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('entities')
    .select('*')
    .order('created_at', { ascending: false })

  handleSupabaseError(error, 'Failed to fetch entities')

  return (data ?? []) as Entity[]
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
  const supabase = await createClient()

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

  revalidatePath('/')

  return ensureFound(entity, error, 'Failed to update entity') as Entity
}

/**
 * Delete an entity
 */
export async function deleteEntity(entityId: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('entities').delete().eq('id', entityId)
  handleSupabaseError(error, 'Failed to delete entity')

  revalidatePath('/')

  return { success: true }
}

/**
 * Bulk delete entities
 */
export async function bulkDeleteEntities(entityIds: string[]) {
  if (entityIds.length === 0) {
    return { success: true, count: 0 }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('entities')
    .delete()
    .in('id', entityIds)

  handleSupabaseError(error, 'Failed to delete entities')
  revalidatePath('/')

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
  // Location fields (granular)
  address?: string        // Full street address
  neighborhood?: string   // e.g., "Tribeca", "West Village"
  city?: string           // e.g., "New York"
  latitude?: number
  longitude?: number
  location?: string       // Legacy field, fallback
  // Contact
  website?: string
  email?: string
  phone?: string
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
 * Create entities from discovered venues
 */
export async function createEntitiesFromDiscovery(
  discoveries: DiscoveredEntityInput[]
): Promise<Entity[]> {
  if (discoveries.length === 0) {
    throw new Error('No venues selected')
  }

  const supabase = await createClient()

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

  // Filter out existing entities
  const newDiscoveries = discoveries.filter(d => {
    const isExisting = (d.googlePlaceId && existingPlaceIds.has(d.googlePlaceId)) ||
      existingNames.has(d.name.toLowerCase())
    return !isExisting
  })

  if (newDiscoveries.length === 0) {
    // All entities already exist
    return []
  }

  // Create new entities
  const entitiesToInsert = newDiscoveries.map(d => {
    // Metadata for additional fields not in columns
    const metadata: EntityMetadata = {
      email: d.email,
      phone: d.phone,
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
      // Granular location columns
      address: d.address || null,
      neighborhood: d.neighborhood || null,
      city: d.city || null,
      latitude: d.latitude || null,
      longitude: d.longitude || null,
      // Legacy location field (for display)
      location: d.location || d.address || (d.neighborhood && d.city ? `${d.neighborhood}, ${d.city}` : d.city) || null,
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

  revalidatePath('/')

  return (created ?? []) as Entity[]
}

// ============================================================================
// Event-Entity Operations
// ============================================================================

/**
 * Entity with event-specific status
 */
export interface EntityWithEventStatus extends Entity {
  event_entity?: {
    status: string
    notes: string | null
    outreach_approved: boolean
  }
}

/**
 * Get all entities linked to an event
 */
export async function getEntitiesByEvent(eventId: string): Promise<EntityWithEventStatus[]> {
  validateUUID(eventId, 'event ID')

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('entities')
    .select(`
      *,
      event_entity:event_entities!inner(
        status,
        notes,
        outreach_approved
      )
    `)
    .eq('event_entities.event_id', eventId)
    .order('created_at', { ascending: false })

  handleSupabaseError(error, 'Failed to fetch entities for event')

  // Flatten the event_entity array to a single object
  return (data ?? []).map((entity) => ({
    ...entity,
    event_entity: Array.isArray(entity.event_entity) 
      ? entity.event_entity[0] 
      : entity.event_entity
  })) as EntityWithEventStatus[]
}

/**
 * Link an entity to an event
 */
export async function linkEntityToEvent(
  eventId: string,
  entityId: string,
  status: string = 'discovered'
) {
  validateUUID(eventId, 'event ID')
  validateUUID(entityId, 'entity ID')

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('event_entities')
    .upsert({
      event_id: eventId,
      entity_id: entityId,
      status,
    })
    .select()
    .single()

  handleSupabaseError(error, 'Failed to link entity to event')
  revalidatePath(`/events/${eventId}`)

  return data
}

/**
 * Update an entity's status within an event
 */
export async function updateEventEntityStatus(
  eventId: string,
  entityId: string,
  status: string,
  notes?: string
) {
  validateUUID(eventId, 'event ID')
  validateUUID(entityId, 'entity ID')

  const supabase = await createClient()

  const updateData: Record<string, unknown> = { status }
  if (notes !== undefined) {
    updateData.notes = notes
  }

  const { data, error } = await supabase
    .from('event_entities')
    .update(updateData)
    .eq('event_id', eventId)
    .eq('entity_id', entityId)
    .select()
    .single()

  handleSupabaseError(error, 'Failed to update entity status')
  revalidatePath(`/events/${eventId}`)

  return data
}

/**
 * Approve an entity for outreach within an event
 */
export async function approveForOutreach(
  eventId: string,
  entityId: string,
  approved: boolean = true
) {
  validateUUID(eventId, 'event ID')
  validateUUID(entityId, 'entity ID')

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('event_entities')
    .update({ outreach_approved: approved })
    .eq('event_id', eventId)
    .eq('entity_id', entityId)
    .select()
    .single()

  handleSupabaseError(error, 'Failed to update outreach approval')
  revalidatePath(`/events/${eventId}`)

  return data
}

/**
 * Bulk link entities to an event (for discovery results)
 */
export async function linkEntitiesToEvent(
  eventId: string,
  entityIds: string[]
) {
  if (entityIds.length === 0) {
    return { success: true, count: 0 }
  }

  validateUUID(eventId, 'event ID')

  const supabase = await createClient()

  const links = entityIds.map(entityId => ({
    event_id: eventId,
    entity_id: entityId,
    status: 'discovered',
  }))

  const { error } = await supabase
    .from('event_entities')
    .upsert(links, { onConflict: 'event_id,entity_id' })

  handleSupabaseError(error, 'Failed to link entities to event')
  revalidatePath(`/events/${eventId}`)

  return { success: true, count: entityIds.length }
}

/**
 * Unlink an entity from an event
 */
export async function unlinkEntityFromEvent(eventId: string, entityId: string) {
  validateUUID(eventId, 'event ID')
  validateUUID(entityId, 'entity ID')

  const supabase = await createClient()

  const { error } = await supabase
    .from('event_entities')
    .delete()
    .eq('event_id', eventId)
    .eq('entity_id', entityId)

  handleSupabaseError(error, 'Failed to unlink entity from event')
  revalidatePath(`/events/${eventId}`)

  return { success: true }
}
