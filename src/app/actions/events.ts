'use server'

import {
  createClient,
  handleSupabaseError,
  ensureFound
} from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { validateUUID } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export interface Event {
  id: string
  name: string
  date: string | null
  city: string | null
  headcount: number | null
  total_budget: number | null
  description: string | null
  constraints: {
    neighborhoods?: string[]
    cuisines?: string[]
    [key: string]: unknown
  } | null
  chat_history: Array<{
    role: 'user' | 'assistant'
    content: string
    created_at: string
  }>
  created_at: string
  updated_at: string
}

// ============================================================================
// Event CRUD Operations
// ============================================================================

/**
 * Get an event by ID
 */
export async function getEvent(eventId: string): Promise<Event> {
  validateUUID(eventId, 'event ID')

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  return ensureFound(data, error, 'Event not found') as Event
}

/**
 * Get all events
 */
export async function getAllEvents(): Promise<Event[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })

  handleSupabaseError(error, 'Failed to fetch events')

  return (data ?? []) as Event[]
}

/**
 * Create a new event
 */
export async function createEvent(data: {
  name: string
  date?: string
  city?: string
  headcount?: number
  total_budget?: number
  description?: string
  constraints?: Event['constraints']
}): Promise<Event> {
  const supabase = await createClient()

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      name: data.name,
      date: data.date || null,
      city: data.city || null,
      headcount: data.headcount || null,
      total_budget: data.total_budget || null,
      description: data.description || null,
      constraints: data.constraints || {},
      chat_history: [],
    })
    .select()
    .single()

  revalidatePath('/')

  return ensureFound(event, error, 'Failed to create event') as Event
}

/**
 * Update an event
 */
export async function updateEvent(
  eventId: string,
  data: Partial<{
    name: string
    date: string
    city: string
    headcount: number
    total_budget: number
    description: string
    constraints: Event['constraints']
  }>
): Promise<Event> {
  validateUUID(eventId, 'event ID')

  const supabase = await createClient()

  const { data: event, error } = await supabase
    .from('events')
    .update(data)
    .eq('id', eventId)
    .select()
    .single()

  revalidatePath('/')
  revalidatePath(`/events/${eventId}`)

  return ensureFound(event, error, 'Failed to update event') as Event
}

/**
 * Delete an event
 */
export async function deleteEvent(eventId: string) {
  validateUUID(eventId, 'event ID')

  const supabase = await createClient()

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)

  handleSupabaseError(error, 'Failed to delete event')
  revalidatePath('/')

  return { success: true }
}

// ============================================================================
// Chat History Operations
// ============================================================================

/**
 * Add a message to the event's chat history
 */
export async function addChatMessage(
  eventId: string,
  message: { role: 'user' | 'assistant'; content: string }
): Promise<Event> {
  validateUUID(eventId, 'event ID')

  const supabase = await createClient()

  // Get current chat history
  const { data: event, error: getError } = await supabase
    .from('events')
    .select('chat_history')
    .eq('id', eventId)
    .single()

  if (getError) {
    handleSupabaseError(getError, 'Failed to get event chat history')
  }

  const currentHistory = (event?.chat_history as Event['chat_history']) || []
  const newMessage = {
    ...message,
    created_at: new Date().toISOString(),
  }

  const { data: updated, error: updateError } = await supabase
    .from('events')
    .update({
      chat_history: [...currentHistory, newMessage],
    })
    .eq('id', eventId)
    .select()
    .single()

  return ensureFound(updated, updateError, 'Failed to add chat message') as Event
}

/**
 * Clear the chat history for an event
 */
export async function clearChatHistory(eventId: string): Promise<Event> {
  validateUUID(eventId, 'event ID')

  const supabase = await createClient()

  const { data: event, error } = await supabase
    .from('events')
    .update({ chat_history: [] })
    .eq('id', eventId)
    .select()
    .single()

  return ensureFound(event, error, 'Failed to clear chat history') as Event
}
