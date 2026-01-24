'use server'

import { createClient, getAuthenticatedClient } from '@/lib/supabase/server'
import { Event } from '@/types/database'
import { revalidatePath } from 'next/cache'
import { isValidUUID } from '@/lib/utils'

export async function createEmptyEvent() {
  const { supabase, user } = await getAuthenticatedClient()

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      user_id: user.id,
      name: 'Untitled Event',
      city: '',
      preferred_dates: [],
      headcount: 0,
      total_budget: 0,
      venue_budget_ceiling: 0,
      date_flexibility_days: 0,
      budget_flexibility_percent: 0,
      constraints: {},
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating empty event:', error)
    throw new Error('Failed to create event')
  }

  revalidatePath('/events')
  revalidatePath('/', 'layout')
  return event as Event
}

export async function createEvent(data: {
  name: string
  city: string
  preferred_dates: { date: string; rank: number }[]
  headcount: number
  total_budget: number
  venue_budget_ceiling: number
  date_flexibility_days: number
  budget_flexibility_percent: number
  constraints: {
    ada?: boolean
    alcohol?: boolean
    noise?: boolean
    indoor_outdoor?: 'indoor' | 'outdoor' | 'either'
    neighborhood?: string
    time_frame?: 'morning' | 'afternoon' | 'evening' | 'night'
    venue_types?: string[]
    catering?: {
      food?: boolean
      drinks?: boolean
      external_vendors_allowed?: boolean
    }
  }
  location_address?: string | null
  location_lat?: number | null
  location_lng?: number | null
}) {
  const { supabase, user } = await getAuthenticatedClient()

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      user_id: user.id,
      ...data,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating event:', error)
    throw new Error('Failed to create event')
  }

  revalidatePath('/events')
  revalidatePath('/', 'layout')
  return event as Event
}

export async function getEvent(id: string) {
  if (!isValidUUID(id)) {
    throw new Error('Invalid event ID')
  }

  const { supabase } = await getAuthenticatedClient()

  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching event:', error)
    throw new Error('Failed to fetch event')
  }

  return event as Event
}

export async function updateEventSettings(
  id: string,
  data: Partial<Omit<Event, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
) {
  const { supabase, user } = await getAuthenticatedClient()

  const { data: event, error } = await supabase
    .from('events')
    .update(data)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating event:', error)
    throw new Error('Failed to update event')
  }

  revalidatePath(`/events/${id}`)
  revalidatePath('/', 'layout')
  return event as Event
}

export async function listUserEvents() {
  const { supabase, user } = await getAuthenticatedClient()

  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error && Object.keys(error).length > 0) {
    console.error('Error fetching events:', error)
    throw new Error('Failed to fetch events')
  }

  return (events ?? []) as Event[]
}

export async function deleteEvent(id: string) {
  const { supabase, user } = await getAuthenticatedClient()

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting event:', error)
    throw new Error('Failed to delete event')
  }

  revalidatePath('/events')
  revalidatePath('/', 'layout')
}
