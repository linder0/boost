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
import { generateOutreachMessage, generateVendorSummary } from '@/lib/ai/outreach-generator'
import type { VendorInfo } from '@/lib/ai/outreach-generator'
import type { UserProfile } from '@/app/actions/profile'
import { SupabaseClient } from '@supabase/supabase-js'

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Fetch user profile for message personalization.
 * Reuses an existing Supabase client to avoid an extra auth round-trip.
 */
async function fetchUserProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  // PGRST116 = "no rows returned" — expected for new users
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user profile:', error)
  }

  return data as UserProfile | null
}

/**
 * Extract VendorInfo from a typed Vendor record for AI calls.
 */
function toVendorInfo(vendor: Vendor): VendorInfo {
  return {
    name: vendor.name,
    category: vendor.category,
    cuisine: vendor.cuisine ?? null,
    price_per_person: vendor.price_per_person ?? null,
    website: vendor.website ?? null,
    has_private_dining: vendor.has_private_dining ?? null,
    private_dining_capacity_min: vendor.private_dining_capacity_min ?? null,
    private_dining_capacity_max: vendor.private_dining_capacity_max ?? null,
    private_dining_minimum: vendor.private_dining_minimum ?? null,
    rating: vendor.rating ?? null,
    beli_rank: vendor.beli_rank ?? null,
    address: vendor.address ?? null,
    phone: vendor.phone ?? null,
  }
}

/**
 * Generate AI outreach message + summary for a vendor, then persist both.
 * Summary update is best-effort (column may not exist yet in local DB).
 */
async function generateAndStoreOutreach(
  supabase: SupabaseClient,
  vendor: Vendor,
  event: Event,
  userProfile: UserProfile | null,
  suggestions?: string
): Promise<string> {
  const vendorInfo = toVendorInfo(vendor)
  const [message, summary] = await Promise.all([
    generateOutreachMessage(event, vendorInfo, userProfile, suggestions),
    generateVendorSummary(vendorInfo),
  ])

  // Save message (critical)
  const { error: msgError } = await supabase
    .from('vendors')
    .update({ custom_message: message })
    .eq('id', vendor.id)

  handleSupabaseError(msgError, 'Failed to update vendor message')

  // Save summary (best-effort — column may not exist yet)
  await supabase
    .from('vendors')
    .update({ summary })
    .eq('id', vendor.id)
    .then(({ error }) => {
      if (error) console.warn('Summary update skipped:', error.message)
    })

  return message
}

// ============================================================================
// CRUD Operations
// ============================================================================

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
    .insert({ event_id: eventId, ...data })
    .select()
    .single()

  const created = ensureFound(vendor, error, 'Failed to create vendor')
  await createVendorThreads(supabase, [created.id])

  revalidatePath(`/events/${eventId}/vendors`)
  return created as Vendor
}

export async function bulkCreateVendors(
  eventId: string,
  vendors: {
    name: string
    category?: string
    contact_email: string
    website?: string | null
    custom_message?: string | null
    price_per_person?: string | null
  }[]
) {
  const { supabase, user } = await getAuthenticatedClient()
  await verifyEventOwnership(supabase, eventId, user.id)

  const vendorsToInsert = vendors.map((v) => ({
    event_id: eventId,
    name: v.name,
    category: v.category || 'Vendor',
    contact_email: v.contact_email,
    website: v.website || null,
    custom_message: v.custom_message || null,
    price_per_person: v.price_per_person || null,
    discovery_source: 'csv' as const,
  }))

  const { data: createdVendors, error } = await supabase
    .from('vendors')
    .insert(vendorsToInsert)
    .select()

  handleSupabaseError(error, 'Failed to create vendors')
  const created = (createdVendors ?? []) as Vendor[]
  await createVendorThreads(supabase, created.map((v) => v.id))

  // Generate AI summaries for the imported vendors (non-blocking)
  generateVendorSummariesInternal(supabase, created).catch((err) =>
    console.error('Failed to generate vendor summaries:', err)
  )

  revalidatePath(`/events/${eventId}/vendors`)
  return created
}

export async function getVendorsByEvent(eventId: string) {
  validateUUID(eventId, 'event ID')

  const { supabase } = await getAuthenticatedClient()

  const { data: vendors, error } = await supabase
    .from('vendors')
    .select('*, vendor_threads(*, messages(id, body, sender, created_at))')
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
  data: Partial<Pick<Vendor, 'name' | 'category' | 'contact_email' | 'address' | 'latitude' | 'longitude' | 'website' | 'price_per_person' | 'custom_message' | 'phone' | 'cuisine'>>
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
    ? { address: location.address, latitude: location.latitude, longitude: location.longitude }
    : { address: null, latitude: null, longitude: null }

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
  if (vendorIds.length === 0) return { success: true, count: 0 }

  const { supabase, user } = await getAuthenticatedClient()
  await verifyEventOwnership(supabase, eventId, user.id)

  const { error } = await supabase
    .from('vendors')
    .delete()
    .in('id', vendorIds)

  handleSupabaseError(error, 'Failed to delete vendors')

  revalidatePath(`/events/${eventId}/vendors`)
  return { success: true, count: vendorIds.length }
}

// ============================================================================
// Discovery Import
// ============================================================================

export interface DiscoveredVendorInput {
  name: string
  category: string
  contact_email: string
  address?: string
  latitude?: number
  longitude?: number
  website?: string
  rating?: number
  email_confidence?: number
  google_place_id?: string
  phone?: string
  discovery_source?: string
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
  if (selectedVenues.length === 0) throw new Error('No venues selected')

  const { supabase, user } = await getAuthenticatedClient()
  const event = await verifyEventOwnership(supabase, eventId, user.id)

  // Get existing vendor emails for this event to prevent duplicates
  const { data: existingVendors } = await supabase
    .from('vendors')
    .select('contact_email')
    .eq('event_id', eventId)

  const existingEmails = new Set(
    (existingVendors ?? []).map((v: { contact_email: string }) => v.contact_email.toLowerCase())
  )

  // Filter out already-existing vendors, then deduplicate within selection
  const seenEmails = new Set<string>()
  const uniqueVenues = selectedVenues.filter((v) => {
    const emailLower = v.contact_email.toLowerCase()
    if (existingEmails.has(emailLower) || seenEmails.has(emailLower)) return false
    seenEmails.add(emailLower)
    return true
  })

  if (uniqueVenues.length === 0) {
    revalidatePath(`/events/${eventId}/vendors`)
    return [] as Vendor[]
  }

  const vendorsToInsert = uniqueVenues.map((v) => ({
    event_id: eventId,
    name: v.name,
    category: v.category || 'Restaurant',
    contact_email: v.contact_email,
    address: v.address || null,
    latitude: v.latitude || null,
    longitude: v.longitude || null,
    website: v.website || null,
    rating: v.rating || null,
    email_confidence: v.email_confidence || null,
    google_place_id: v.google_place_id || null,
    phone: v.phone || null,
    discovery_source: v.discovery_source || 'manual',
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
  const created = (createdVendors ?? []) as Vendor[]
  await createVendorThreads(supabase, created.map((v) => v.id))

  // Fetch user profile for personalized messages
  const userProfile = await fetchUserProfile(supabase, user.id)

  // Generate AI outreach messages and summaries in parallel
  const messagePromises = created.map(async (vendor) => {
    try {
      const vendorInfo = toVendorInfo(vendor)
      const [message, summary] = await Promise.all([
        generateOutreachMessage(event, vendorInfo, userProfile),
        generateVendorSummary(vendorInfo),
      ])

      await supabase
        .from('vendors')
        .update({ custom_message: message, summary })
        .eq('id', vendor.id)

      return { vendorId: vendor.id, success: true }
    } catch (err) {
      console.error(`Failed to generate message for vendor ${vendor.id}:`, err)
      return { vendorId: vendor.id, success: false }
    }
  })

  await Promise.allSettled(messagePromises)

  revalidatePath(`/events/${eventId}/vendors`)
  return created
}

// ============================================================================
// AI Message Generation
// ============================================================================

export async function regenerateVendorMessage(vendorId: string, suggestions?: string) {
  validateUUID(vendorId, 'vendor ID')

  const { supabase, user } = await getAuthenticatedClient()

  const { data: vendor, error: vendorError } = await supabase
    .from('vendors')
    .select('*, events(*)')
    .eq('id', vendorId)
    .single()

  const found = ensureFound(vendor, vendorError, 'Vendor not found') as Vendor & { events: Event }
  const event = found.events

  const userProfile = await fetchUserProfile(supabase, user.id)
  const message = await generateAndStoreOutreach(supabase, found, event, userProfile, suggestions)

  revalidatePath(`/events/${event.id}/vendors`)
  return message
}

// ============================================================================
// Vendor Summary
// ============================================================================

export async function regenerateVendorSummary(vendorId: string) {
  validateUUID(vendorId, 'vendor ID')

  const { supabase } = await getAuthenticatedClient()

  const { data: vendor, error: vendorError } = await supabase
    .from('vendors')
    .select('*, events(id)')
    .eq('id', vendorId)
    .single()

  const found = ensureFound(vendor, vendorError, 'Vendor not found') as Vendor & { events: { id: string } }
  const summary = await generateVendorSummary(toVendorInfo(found))

  const { error: updateError } = await supabase
    .from('vendors')
    .update({ summary })
    .eq('id', vendorId)

  handleSupabaseError(updateError, 'Failed to update vendor summary')

  revalidatePath(`/events/${found.events.id}/vendors`)
  return summary
}

/**
 * Generate and store AI summaries for multiple vendors in parallel.
 * Used after bulk import operations.
 */
async function generateVendorSummariesInternal(
  supabase: SupabaseClient,
  vendors: Vendor[]
) {
  const promises = vendors.map(async (vendor) => {
    try {
      const summary = await generateVendorSummary(toVendorInfo(vendor))
      await supabase
        .from('vendors')
        .update({ summary })
        .eq('id', vendor.id)
      return { vendorId: vendor.id, success: true }
    } catch (err) {
      console.error(`Failed to generate summary for vendor ${vendor.id}:`, err)
      return { vendorId: vendor.id, success: false }
    }
  })

  await Promise.allSettled(promises)
}

export async function updateVendorMessage(vendorId: string, message: string) {
  validateUUID(vendorId, 'vendor ID')

  const { supabase } = await getAuthenticatedClient()

  const { data: vendor, error } = await supabase
    .from('vendors')
    .update({ custom_message: message })
    .eq('id', vendorId)
    .select('*, events(id)')
    .single()

  const updated = ensureFound(vendor, error, 'Failed to update vendor message') as Vendor & { events: { id: string } | null }

  if (updated.events) {
    revalidatePath(`/events/${updated.events.id}/vendors`)
  }

  return updated as Vendor
}
