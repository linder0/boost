'use server'

import { getAuthenticatedClient } from '@/lib/supabase/server'
import { Vendor, VendorWithThread } from '@/types/database'
import { revalidatePath } from 'next/cache'
import { isValidUUID } from '@/lib/utils'

export async function createVendor(
  eventId: string,
  data: {
    name: string
    category: string
    contact_email: string
  }
) {
  const { supabase, user } = await getAuthenticatedClient()

  // Verify event ownership
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('user_id', user.id)
    .single()

  if (!event) {
    throw new Error('Event not found or unauthorized')
  }

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

  // Create vendor thread
  await supabase.from('vendor_threads').insert({
    vendor_id: vendor.id,
    status: 'NOT_CONTACTED',
    next_action: 'AUTO',
  })

  revalidatePath(`/events/${eventId}/vendors`)
  return vendor as Vendor
}

export async function bulkCreateVendors(
  eventId: string,
  vendors: { name: string; category: string; contact_email: string }[]
) {
  const { supabase, user } = await getAuthenticatedClient()

  // Verify event ownership
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('user_id', user.id)
    .single()

  if (!event) {
    throw new Error('Event not found or unauthorized')
  }

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

  // Create vendor threads for all vendors
  const threadsToInsert = createdVendors.map((v) => ({
    vendor_id: v.id,
    status: 'NOT_CONTACTED' as const,
    next_action: 'AUTO' as const,
  }))

  await supabase.from('vendor_threads').insert(threadsToInsert)

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
  data: Partial<Pick<Vendor, 'name' | 'category' | 'contact_email'>>
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

export async function deleteVendor(vendorId: string) {
  const { supabase } = await getAuthenticatedClient()

  const { error } = await supabase.from('vendors').delete().eq('id', vendorId)

  if (error) {
    console.error('Error deleting vendor:', error)
    throw new Error('Failed to delete vendor')
  }

  return { success: true }
}
