'use server'

import {
  createClient,
  handleSupabaseError,
  ensureFound
} from '@/lib/supabase/server'
import { Entity, EntityMetadata } from '@/types/database'
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
 * Input type for creating entities from CSV import
 */
export interface ImportedEntityInput {
  name: string
  tags?: string[]
  // Location fields
  address?: string
  neighborhood?: string
  city?: string
  latitude?: number
  longitude?: number
  location?: string
  // Contact
  website?: string
  email?: string
  phone?: string
  // Description / notes
  description?: string
  // Additional metadata (flexible)
  metadata?: Record<string, unknown>
}

/**
 * Create entities from CSV import (Paradigm AI export or manual)
 */
export async function createEntitiesFromImport(
  imports: ImportedEntityInput[],
  eventId?: string
): Promise<Entity[]> {
  if (imports.length === 0) {
    throw new Error('No items to import')
  }

  const supabase = await createClient()

  // Check for existing entities by name to avoid duplicates
  const names = imports.map(d => d.name.toLowerCase())
  const { data: existingEntities } = await supabase
    .from('entities')
    .select('id, name')
    .ilike('name', `%${names[0]}%`)

  const existingNames = new Set(
    (existingEntities ?? []).map((e: { name: string }) => e.name.toLowerCase())
  )

  // Filter out existing entities
  const newImports = imports.filter(d => !existingNames.has(d.name.toLowerCase()))

  if (newImports.length === 0) {
    return []
  }

  // Create new entities
  const entitiesToInsert = newImports.map(d => {
    const metadata: EntityMetadata = {
      email: d.email,
      phone: d.phone,
      discovery_source: 'csv',
      ...(d.metadata || {}),
    }

    // Clean undefined values
    Object.keys(metadata).forEach(key => {
      if (metadata[key as keyof EntityMetadata] === undefined) {
        delete metadata[key as keyof EntityMetadata]
      }
    })

    return {
      name: d.name,
      tags: d.tags || [],
      address: d.address || null,
      neighborhood: d.neighborhood || null,
      city: d.city || null,
      latitude: d.latitude || null,
      longitude: d.longitude || null,
      location: d.location || d.address || (d.neighborhood && d.city ? `${d.neighborhood}, ${d.city}` : d.city) || null,
      description: d.description || null,
      website: d.website || null,
      popularity: null,
      metadata,
    }
  })

  const { data: created, error } = await supabase
    .from('entities')
    .insert(entitiesToInsert)
    .select()

  handleSupabaseError(error, 'Failed to import entities')

  // If eventId provided, link all new entities to the event
  if (eventId && created && created.length > 0) {
    const links = created.map((entity: Entity) => ({
      event_id: eventId,
      entity_id: entity.id,
      status: 'shortlisted',
    }))

    const { error: linkError } = await supabase
      .from('event_entities')
      .upsert(links, { onConflict: 'event_id,entity_id' })

    handleSupabaseError(linkError, 'Failed to link entities to event')
  }

  revalidatePath('/')
  if (eventId) revalidatePath(`/events/${eventId}`)

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

