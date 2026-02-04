'use server'

import {
  getAuthenticatedClient,
  verifyEventOwnership,
  createVendorThreads,
  handleSupabaseError,
  ensureFound
} from '@/lib/supabase/server'
import { Vendor, VendorWithThread, Event } from '@/types/database'
import { revalidatePath } from 'next/cache'
import { validateUUID } from '@/lib/utils'
import { generateOutreachMessage } from '@/lib/ai/outreach-generator'
import { findMatchingRestaurants, DemoRestaurant, demoRestaurantToVendor } from '@/lib/demo/restaurants'
import { discoverRestaurants, DiscoveredRestaurant } from '@/lib/discovery'
import type { UserProfile } from '@/app/actions/profile'
import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Helper to fetch user profile for message personalization
 */
async function fetchUserProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<UserProfile | null> {
  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  return data as UserProfile | null
}

export async function createVendor(
  eventId: string,
  data: {
    name: string
    category: string
    contact_email: string
  }
) {
  const { supabase, user } = await getAuthenticatedClient()

  await verifyEventOwnership(supabase, eventId, user.id)

  const { data: vendor, error } = await supabase
    .from('vendors')
    .insert({
      event_id: eventId,
      ...data,
    })
    .select()
    .single()

  const created = ensureFound(vendor, error, 'Failed to create vendor')
  await createVendorThreads(supabase, [created.id])

  revalidatePath(`/events/${eventId}/vendors`)
  return created as Vendor
}

export async function bulkCreateVendors(
  eventId: string,
  vendors: { name: string; category: string; contact_email: string }[]
) {
  const { supabase, user } = await getAuthenticatedClient()

  await verifyEventOwnership(supabase, eventId, user.id)

  const vendorsToInsert = vendors.map((v) => ({
    event_id: eventId,
    ...v,
  }))

  const { data: createdVendors, error } = await supabase
    .from('vendors')
    .insert(vendorsToInsert)
    .select()

  handleSupabaseError(error, 'Failed to create vendors')
  const created = createdVendors ?? []
  await createVendorThreads(supabase, created.map((v: { id: string }) => v.id))

  revalidatePath(`/events/${eventId}/vendors`)
  return created as Vendor[]
}

export async function getVendorsByEvent(eventId: string) {
  validateUUID(eventId, 'event ID')

  const { supabase } = await getAuthenticatedClient()

  const { data: vendors, error } = await supabase
    .from('vendors')
    .select('*, vendor_threads(*)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  handleSupabaseError(error, 'Failed to fetch vendors')
  return (vendors ?? []) as VendorWithThread[]
}

export async function getVendorDetail(vendorId: string) {
  const { supabase } = await getAuthenticatedClient()

  const { data: vendor, error } = await supabase
    .from('vendors')
    .select(`
      *,
      vendor_threads(
        *,
        messages(
          *,
          parsed_responses(*)
        )
      )
    `)
    .eq('id', vendorId)
    .single()

  return ensureFound(vendor, error, 'Failed to fetch vendor detail')
}

export async function updateVendor(
  vendorId: string,
  data: Partial<Pick<Vendor, 'name' | 'category' | 'contact_email' | 'address' | 'latitude' | 'longitude'>>
) {
  const { supabase } = await getAuthenticatedClient()

  const { data: vendor, error } = await supabase
    .from('vendors')
    .update(data)
    .eq('id', vendorId)
    .select()
    .single()

  return ensureFound(vendor, error, 'Failed to update vendor') as Vendor
}

export async function updateVendorLocation(
  vendorId: string,
  location: { address: string; latitude: number; longitude: number } | null
) {
  const { supabase } = await getAuthenticatedClient()

  const updateData = location
    ? {
        address: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
      }
    : {
        address: null,
        latitude: null,
        longitude: null,
      }

  const { data: vendor, error } = await supabase
    .from('vendors')
    .update(updateData)
    .eq('id', vendorId)
    .select()
    .single()

  return ensureFound(vendor, error, 'Failed to update vendor location') as Vendor
}

export async function deleteVendor(vendorId: string) {
  const { supabase } = await getAuthenticatedClient()

  const { error } = await supabase.from('vendors').delete().eq('id', vendorId)
  handleSupabaseError(error, 'Failed to delete vendor')

  return { success: true }
}

export async function bulkDeleteVendors(vendorIds: string[], eventId: string) {
  if (vendorIds.length === 0) {
    return { success: true, count: 0 }
  }

  const { supabase, user } = await getAuthenticatedClient()

  // Verify user owns this event
  await verifyEventOwnership(supabase, eventId, user.id)

  const { error } = await supabase
    .from('vendors')
    .delete()
    .in('id', vendorIds)

  handleSupabaseError(error, 'Failed to delete vendors')

  revalidatePath(`/events/${eventId}/vendors`)
  return { success: true, count: vendorIds.length }
}

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

// Input type for restaurant discovery with all metadata fields
export interface DiscoveredVendorInput {
  name: string
  category: string
  contact_email: string
  address?: string
  latitude?: number
  longitude?: number
  // Discovery metadata fields
  website?: string
  rating?: number
  email_confidence?: number
  google_place_id?: string
  phone?: string
  discovery_source?: string
  // Restaurant-specific fields
  cuisine?: string
  has_private_dining?: boolean
  private_dining_capacity_min?: number
  private_dining_capacity_max?: number
  private_dining_minimum?: number
  resy_venue_id?: string
  opentable_id?: string
  beli_rank?: number
}

export async function createVendorsFromDiscovery(
  eventId: string,
  selectedVenues: DiscoveredVendorInput[]
) {
  if (selectedVenues.length === 0) {
    throw new Error('No venues selected')
  }

  const { supabase, user } = await getAuthenticatedClient()

  const event = await verifyEventOwnership(supabase, eventId, user.id)

  // Get existing vendor emails for this event to prevent duplicates
  const { data: existingVendors } = await supabase
    .from('vendors')
    .select('contact_email')
    .eq('event_id', eventId)

  const existingEmails = new Set(
    (existingVendors ?? []).map((v: { contact_email: string }) =>
      v.contact_email.toLowerCase()
    )
  )

  // Filter out venues that already exist (by email)
  const newVenues = selectedVenues.filter(
    (v) => !existingEmails.has(v.contact_email.toLowerCase())
  )

  if (newVenues.length === 0) {
    // All selected venues already exist
    revalidatePath(`/events/${eventId}/vendors`)
    return [] as Vendor[]
  }

  // Also deduplicate within the selection (keep first occurrence)
  const seenEmails = new Set<string>()
  const uniqueVenues = newVenues.filter((v) => {
    const emailLower = v.contact_email.toLowerCase()
    if (seenEmails.has(emailLower)) {
      return false
    }
    seenEmails.add(emailLower)
    return true
  })

  const vendorsToInsert = uniqueVenues.map((v) => ({
    event_id: eventId,
    name: v.name,
    category: v.category || 'Restaurant',
    contact_email: v.contact_email,
    address: v.address || null,
    latitude: v.latitude || null,
    longitude: v.longitude || null,
    // Discovery metadata
    website: v.website || null,
    rating: v.rating || null,
    email_confidence: v.email_confidence || null,
    google_place_id: v.google_place_id || null,
    phone: v.phone || null,
    discovery_source: v.discovery_source || 'manual',
    // Restaurant-specific fields
    cuisine: v.cuisine || null,
    has_private_dining: v.has_private_dining ?? null,
    private_dining_capacity_min: v.private_dining_capacity_min || null,
    private_dining_capacity_max: v.private_dining_capacity_max || null,
    private_dining_minimum: v.private_dining_minimum || null,
    resy_venue_id: v.resy_venue_id || null,
    opentable_id: v.opentable_id || null,
    beli_rank: v.beli_rank || null,
  }))

  const { data: createdVendors, error } = await supabase
    .from('vendors')
    .insert(vendorsToInsert)
    .select()

  handleSupabaseError(error, 'Failed to create vendors')
  const created = createdVendors ?? []
  await createVendorThreads(supabase, created.map((v: { id: string }) => v.id))

  // Fetch user profile for personalized messages
  const userProfile = await fetchUserProfile(supabase, user.id)

  // Generate AI outreach messages for each vendor (in parallel)
  const messagePromises = created.map(async (vendor: { id: string; name: string; category: string }) => {
    try {
      const message = await generateOutreachMessage(event, {
        name: vendor.name,
        category: vendor.category,
      }, userProfile)

      await supabase
        .from('vendors')
        .update({ custom_message: message })
        .eq('id', vendor.id)

      return { vendorId: vendor.id, success: true }
    } catch (err) {
      console.error(`Failed to generate message for vendor ${vendor.id}:`, err)
      return { vendorId: vendor.id, success: false }
    }
  })

  // Wait for all messages to be generated (don't block on failures)
  await Promise.allSettled(messagePromises)

  revalidatePath(`/events/${eventId}/vendors`)
  return created as Vendor[]
}

// Regenerate AI outreach message for a vendor
export async function regenerateVendorMessage(vendorId: string) {
  validateUUID(vendorId, 'vendor ID')

  const { supabase, user } = await getAuthenticatedClient()

  // Fetch vendor with event data
  const { data: vendor, error: vendorError } = await supabase
    .from('vendors')
    .select('*, events(*)')
    .eq('id', vendorId)
    .single()

  const found = ensureFound(vendor, vendorError, 'Vendor not found')
  const event = found.events as Event

  // Fetch user profile for personalized message
  const userProfile = await fetchUserProfile(supabase, user.id)

  // Generate new message with user context
  const message = await generateOutreachMessage(event, {
    name: found.name,
    category: found.category,
  }, userProfile)

  // Update vendor with new message
  const { error: updateError } = await supabase
    .from('vendors')
    .update({ custom_message: message })
    .eq('id', vendorId)

  handleSupabaseError(updateError, 'Failed to update vendor message')

  revalidatePath(`/events/${event.id}/vendors`)
  return message
}

// Update vendor's custom message manually
export async function updateVendorMessage(vendorId: string, message: string) {
  validateUUID(vendorId, 'vendor ID')

  const { supabase } = await getAuthenticatedClient()

  const { data: vendor, error } = await supabase
    .from('vendors')
    .update({ custom_message: message })
    .eq('id', vendorId)
    .select('*, events(id)')
    .single()

  const updated = ensureFound(vendor, error, 'Failed to update vendor message')

  if (updated.events) {
    revalidatePath(`/events/${(updated.events as { id: string }).id}/vendors`)
  }

  return updated as Vendor
}
