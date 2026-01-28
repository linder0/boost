'use server'

import { 
  getAuthenticatedClient,
  handleSupabaseError,
  ensureFound
} from '@/lib/supabase/server'
import { VendorStatus } from '@/types/database'
import { revalidatePath } from 'next/cache'
import { inngest } from '@/inngest/client'

export async function startOutreach(vendorId: string) {
  const { supabase, user } = await getAuthenticatedClient()

  // Get vendor and verify ownership through event
  const { data: vendor, error: vendorError } = await supabase
    .from('vendors')
    .select('*, events!inner(user_id)')
    .eq('id', vendorId)
    .single()

  const found = ensureFound(vendor, vendorError, 'Vendor not found')

  // Trigger Inngest outreach event
  await inngest.send({
    name: 'vendor.outreach.start',
    data: {
      vendorId,
      userId: user.id,
    },
  })

  revalidatePath(`/events/${found.event_id}/vendors`)
  return { success: true }
}

export async function escalateThread(
  threadId: string,
  humanResponse: string
) {
  const { supabase, user } = await getAuthenticatedClient()

  // Get thread with vendor info
  const { data: thread, error: threadError } = await supabase
    .from('vendor_threads')
    .select('*, vendors!inner(*, events!inner(user_id))')
    .eq('id', threadId)
    .single()

  // Store human message
  await supabase.from('messages').insert({
    thread_id: threadId,
    sender: 'HUMAN',
    body: humanResponse,
    inbound: false,
  })

  // Update thread status
  await supabase
    .from('vendor_threads')
    .update({
      status: 'WAITING',
      escalation_reason: null,
      last_touch: new Date().toISOString(),
    })
    .eq('id', threadId)

  // Send email via Inngest
  await inngest.send({
    name: 'message.human.send',
    data: {
      threadId,
      userId: user.id,
      message: humanResponse,
    },
  })

  revalidatePath(`/events/${found.vendors.event_id}/vendors`)
  return { success: true }
}

export async function updateThreadStatus(threadId: string, status: VendorStatus) {
  const { supabase } = await getAuthenticatedClient()

  const { data: thread, error } = await supabase
    .from('vendor_threads')
    .update({ status })
    .eq('id', threadId)
    .select('*, vendors!inner(event_id)')
    .single()

  const updated = ensureFound(thread, error, 'Failed to update thread status')

  revalidatePath(`/events/${updated.vendors.event_id}/vendors`)
  return updated
}

export async function bulkStartOutreach(eventId: string) {
  const { supabase, user } = await getAuthenticatedClient()

  // Get all vendors with NOT_CONTACTED status
  const { data: vendors, error } = await supabase
    .from('vendors')
    .select('id, vendor_threads!inner(status)')
    .eq('event_id', eventId)
    .eq('vendor_threads.status', 'NOT_CONTACTED')

  handleSupabaseError(error, 'Failed to fetch vendors')
  const vendorList = vendors ?? []

  // Trigger outreach for all vendors
  const promises = vendorList.map((vendor) =>
    inngest.send({
      name: 'vendor.outreach.start',
      data: {
        vendorId: vendor.id,
        userId: user.id,
      },
    })
  )

  await Promise.all(promises)

  revalidatePath(`/events/${eventId}/vendors`)
  return { success: true, count: vendorList.length }
}

// Alias for semantic clarity in venue discovery flow
export const startOutreachForEvent = bulkStartOutreach

export async function startOutreachByCategory(eventId: string, category: string) {
  const { supabase, user } = await getAuthenticatedClient()

  // Get all vendors with NOT_CONTACTED status in the specified category
  const { data: vendors, error } = await supabase
    .from('vendors')
    .select('id, vendor_threads!inner(status)')
    .eq('event_id', eventId)
    .eq('category', category)
    .eq('vendor_threads.status', 'NOT_CONTACTED')

  handleSupabaseError(error, 'Failed to fetch vendors')
  const vendorList = vendors ?? []

  // Trigger outreach for all vendors in this category
  const promises = vendorList.map((vendor) =>
    inngest.send({
      name: 'vendor.outreach.start',
      data: {
        vendorId: vendor.id,
        userId: user.id,
      },
    })
  )

  await Promise.all(promises)

  revalidatePath(`/events/${eventId}/vendors`)
  return { success: true, count: vendorList.length }
}
