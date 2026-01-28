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
import { isValidUUID } from '@/lib/utils'
import { generateOutreachMessage } from '@/lib/ai/outreach-generator'
import { findMatchingVenues, DemoVenue } from '@/lib/demo/venues'
import { discoverVenues, DiscoveredVenue } from '@/lib/discovery'

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
  if (!isValidUUID(eventId)) {
    console.warn('Invalid event ID format:', eventId)
    return [] as VendorWithThread[]
  }

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

export async function discoverVenuesForEvent(eventId: string): Promise<{
  venues: (DemoVenue | DiscoveredVenue)[]
  event: { city: string; headcount: number; budget: number }
  source: 'google_places' | 'demo'
}> {
  if (!isValidUUID(eventId)) {
    throw new Error('Invalid event ID')
  }

  const { supabase, user } = await getAuthenticatedClient()

  const event = await verifyEventOwnership(supabase, eventId, user.id)

  // Try real discovery first (Google Places + Hunter)
  const hasGooglePlacesKey = !!process.env.GOOGLE_PLACES_API_KEY
  
  if (hasGooglePlacesKey) {
    try {
      // Get venue types from event constraints, or use defaults
      const venueTypes = event.constraints?.venue_types || ['restaurant', 'bar', 'rooftop']
      
      const discoveredVenues = await discoverVenues(
        event.city,
        venueTypes,
        20 // Limit results
      )

      if (discoveredVenues.length > 0) {
        return {
          venues: discoveredVenues,
          event: {
            city: event.city,
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

  // Fallback to demo venues
  const venues = findMatchingVenues({
    city: event.city,
    headcount: event.headcount,
    budget: event.total_budget || event.venue_budget_ceiling,
    venueTypes: event.constraints?.venue_types,
    indoorOutdoor: event.constraints?.indoor_outdoor,
    neighborhood: event.constraints?.neighborhood,
    requiresFood: event.constraints?.catering?.food,
    requiresDrinks: event.constraints?.catering?.drinks,
    externalVendorsRequired: event.constraints?.catering?.external_vendors_allowed,
  })

  return {
    venues,
    event: {
      city: event.city,
      headcount: event.headcount,
      budget: event.total_budget,
    },
    source: 'demo',
  }
}

export async function createVendorsFromDiscovery(
  eventId: string,
  selectedVenues: { 
    name: string
    category: string
    contact_email: string
    address?: string
    latitude?: number
    longitude?: number
  }[]
) {
  if (selectedVenues.length === 0) {
    throw new Error('No venues selected')
  }

  const { supabase, user } = await getAuthenticatedClient()

  const event = await verifyEventOwnership(supabase, eventId, user.id)

  const vendorsToInsert = selectedVenues.map((v) => ({
    event_id: eventId,
    name: v.name,
    category: v.category,
    contact_email: v.contact_email,
    address: v.address || null,
    latitude: v.latitude || null,
    longitude: v.longitude || null,
  }))

  const { data: createdVendors, error } = await supabase
    .from('vendors')
    .insert(vendorsToInsert)
    .select()

  handleSupabaseError(error, 'Failed to create vendors')
  const created = createdVendors ?? []
  await createVendorThreads(supabase, created.map((v: { id: string }) => v.id))

  // Generate AI outreach messages for each vendor (in parallel)
  const messagePromises = created.map(async (vendor: { id: string; name: string; category: string }) => {
    try {
      const message = await generateOutreachMessage(event, {
        name: vendor.name,
        category: vendor.category,
      })
      
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
  if (!isValidUUID(vendorId)) {
    throw new Error('Invalid vendor ID')
  }

  const { supabase } = await getAuthenticatedClient()

  // Fetch vendor with event data
  const { data: vendor, error: vendorError } = await supabase
    .from('vendors')
    .select('*, events(*)')
    .eq('id', vendorId)
    .single()

  const found = ensureFound(vendor, vendorError, 'Vendor not found')
  const event = found.events as Event

  // Generate new message
  const message = await generateOutreachMessage(event, {
    name: found.name,
    category: found.category,
  })

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
  if (!isValidUUID(vendorId)) {
    throw new Error('Invalid vendor ID')
  }

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
