'use server'

import { getAuthenticatedClient, verifyEventOwnership, createVendorThreads } from '@/lib/supabase/server'
import { Vendor, VendorWithThread, Event } from '@/types/database'
import { revalidatePath } from 'next/cache'
import { isValidUUID } from '@/lib/utils'
import { generateOutreachMessage } from '@/lib/ai/outreach-generator'
import { findMatchingVenues, DemoVenue } from '@/lib/demo/venues'

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

  if (error) {
    console.error('Error creating vendor:', error)
    throw new Error('Failed to create vendor')
  }

  await createVendorThreads(supabase, [vendor.id])

  revalidatePath(`/events/${eventId}/vendors`)
  return vendor as Vendor
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

  if (error) {
    console.error('Error creating vendors:', error)
    throw new Error('Failed to create vendors')
  }

  await createVendorThreads(supabase, createdVendors.map((v: { id: string }) => v.id))

  revalidatePath(`/events/${eventId}/vendors`)
  return createdVendors as Vendor[]
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

  if (error && Object.keys(error).length > 0) {
    console.error('Error fetching vendors:', error)
    throw new Error('Failed to fetch vendors')
  }

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

  if (error) {
    console.error('Error fetching vendor detail:', error)
    throw new Error('Failed to fetch vendor detail')
  }

  return vendor
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

  if (error) {
    console.error('Error updating vendor:', error)
    throw new Error('Failed to update vendor')
  }

  return vendor as Vendor
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

  if (error) {
    console.error('Error updating vendor location:', error)
    throw new Error('Failed to update vendor location')
  }

  return vendor as Vendor
}

export async function deleteVendor(vendorId: string) {
  const { supabase } = await getAuthenticatedClient()

  const { error } = await supabase.from('vendors').delete().eq('id', vendorId)

  if (error) {
    console.error('Error deleting vendor:', error)
    throw new Error('Failed to delete vendor')
  }

  return { success: true }
}

export async function discoverVenuesForEvent(eventId: string): Promise<{
  venues: DemoVenue[]
  event: { city: string; headcount: number; budget: number }
}> {
  if (!isValidUUID(eventId)) {
    throw new Error('Invalid event ID')
  }

  const { supabase, user } = await getAuthenticatedClient()

  const event = await verifyEventOwnership(supabase, eventId, user.id)

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

  if (error) {
    console.error('Error creating vendors from discovery:', error)
    throw new Error('Failed to create vendors')
  }

  await createVendorThreads(supabase, createdVendors.map((v: { id: string }) => v.id))

  // Generate AI outreach messages for each vendor (in parallel)
  const messagePromises = createdVendors.map(async (vendor: { id: string; name: string; category: string }) => {
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
  return createdVendors as Vendor[]
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

  if (vendorError || !vendor) {
    throw new Error('Vendor not found')
  }

  const event = vendor.events as Event

  // Generate new message
  const message = await generateOutreachMessage(event, {
    name: vendor.name,
    category: vendor.category,
  })

  // Update vendor with new message
  const { error: updateError } = await supabase
    .from('vendors')
    .update({ custom_message: message })
    .eq('id', vendorId)

  if (updateError) {
    console.error('Error updating vendor message:', updateError)
    throw new Error('Failed to update vendor message')
  }

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

  if (error) {
    console.error('Error updating vendor message:', error)
    throw new Error('Failed to update vendor message')
  }

  if (vendor.events) {
    revalidatePath(`/events/${(vendor.events as { id: string }).id}/vendors`)
  }

  return vendor as Vendor
}
