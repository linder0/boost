'use server'

import { createClient } from '@/lib/supabase/server'
import { Event } from '@/types/database'
import { revalidatePath } from 'next/cache'

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
  }
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

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
  return event as Event
}

export async function getEvent(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

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
  return event as Event
}

export async function listUserEvents() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching events:', error)
    throw new Error('Failed to fetch events')
  }

  return events as Event[]
}
