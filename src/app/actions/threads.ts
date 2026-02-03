'use server'

import {
  getAuthenticatedClient,
  handleSupabaseError,
  ensureFound
} from '@/lib/supabase/server'
import { VendorStatus, AutomationStep } from '@/types/database'
import { revalidatePath } from 'next/cache'
import { inngest } from '@/inngest/client'
import { validateUUID, validateUUIDs } from '@/lib/utils'

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

  revalidatePath(`/events/${thread.vendors.event_id}/vendors`)
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

// ============================================================================
// Outreach Approval Workflow
// ============================================================================

/**
 * Approve outreach for a single vendor
 * This marks the vendor as approved and triggers the outreach
 */
export async function approveOutreach(vendorId: string) {
  validateUUID(vendorId, 'vendor ID')

  const { supabase, user } = await getAuthenticatedClient()

  // Get vendor and thread
  const { data: vendor, error: vendorError } = await supabase
    .from('vendors')
    .select('*, vendor_threads!inner(*)')
    .eq('id', vendorId)
    .single()

  const found = ensureFound(vendor, vendorError, 'Vendor not found')
  const thread = found.vendor_threads

  // Update thread with approval
  const automationHistory: AutomationStep[] = [
    ...(thread.automation_history || []),
    {
      type: 'APPROVAL',
      timestamp: new Date().toISOString(),
      details: { approved_by: user.id },
    },
  ]

  await supabase
    .from('vendor_threads')
    .update({
      outreach_approved: true,
      outreach_approved_at: new Date().toISOString(),
      outreach_approved_by: user.id,
      automation_history: automationHistory,
    })
    .eq('id', thread.id)

  // Log the approval
  await supabase.from('automation_logs').insert({
    event_id: found.event_id,
    vendor_id: vendorId,
    event_type: 'APPROVAL',
    details: {
      approved_by: user.id,
      vendor_name: found.name,
    },
  })

  // Trigger the outreach
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

/**
 * Bulk approve outreach for multiple vendors
 */
export async function bulkApproveOutreach(vendorIds: string[]) {
  if (vendorIds.length === 0) {
    throw new Error('No vendors specified')
  }

  // Validate all IDs
  validateUUIDs(vendorIds, 'vendor ID')

  const { supabase, user } = await getAuthenticatedClient()

  // Get all vendors with their threads
  const { data: vendors, error } = await supabase
    .from('vendors')
    .select('*, vendor_threads!inner(*)')
    .in('id', vendorIds)

  handleSupabaseError(error, 'Failed to fetch vendors')
  const vendorList = vendors ?? []

  if (vendorList.length === 0) {
    throw new Error('No vendors found')
  }

  const eventId = vendorList[0].event_id

  // Update all threads with approval
  const updatePromises = vendorList.map(async (vendor) => {
    const thread = vendor.vendor_threads
    const automationHistory: AutomationStep[] = [
      ...(thread.automation_history || []),
      {
        type: 'APPROVAL',
        timestamp: new Date().toISOString(),
        details: { approved_by: user.id, bulk: true },
      },
    ]

    return supabase
      .from('vendor_threads')
      .update({
        outreach_approved: true,
        outreach_approved_at: new Date().toISOString(),
        outreach_approved_by: user.id,
        automation_history: automationHistory,
      })
      .eq('id', thread.id)
  })

  await Promise.all(updatePromises)

  // Log bulk approval
  await supabase.from('automation_logs').insert({
    event_id: eventId,
    vendor_id: null,
    event_type: 'APPROVAL',
    details: {
      approved_by: user.id,
      vendor_count: vendorList.length,
      vendor_ids: vendorIds,
      bulk: true,
    },
  })

  // Trigger outreach for all vendors
  const outreachPromises = vendorList.map((vendor) =>
    inngest.send({
      name: 'vendor.outreach.start',
      data: {
        vendorId: vendor.id,
        userId: user.id,
      },
    })
  )

  await Promise.all(outreachPromises)

  revalidatePath(`/events/${eventId}/vendors`)
  return { success: true, count: vendorList.length }
}

/**
 * Get vendors pending approval for an event
 */
export async function getPendingApprovalVendors(eventId: string) {
  validateUUID(eventId, 'event ID')

  const { supabase } = await getAuthenticatedClient()

  const { data: vendors, error } = await supabase
    .from('vendors')
    .select('*, vendor_threads!inner(*)')
    .eq('event_id', eventId)
    .eq('vendor_threads.status', 'NOT_CONTACTED')
    .eq('vendor_threads.outreach_approved', false)

  handleSupabaseError(error, 'Failed to fetch pending vendors')
  return vendors ?? []
}
