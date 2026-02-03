import { SupabaseClient } from '@supabase/supabase-js'
import { normalizeJoinResult } from '@/lib/utils'
import { AutomationStep, LogEventType } from '@/types/database'

// ============================================================================
// Type Definitions
// ============================================================================

export interface ThreadVendorEvent {
  thread: {
    id: string
    vendor_id: string
    status: string
    gmail_thread_id: string | null
    automation_history: AutomationStep[] | null
    follow_up_count: number
    [key: string]: unknown
  }
  vendor: {
    id: string
    event_id: string
    name: string
    contact_email: string
    [key: string]: unknown
  }
  event: {
    id: string
    name: string
    user_id: string
    [key: string]: unknown
  }
}

// ============================================================================
// Data Extraction Helpers
// ============================================================================

/**
 * Extract thread, vendor, and event from a nested Supabase join result.
 * This handles the common pattern of navigating through:
 * message.vendor_threads.vendors.events or parsed_response.messages.vendor_threads.vendors.events
 */
export function extractThreadVendorEvent(
  data: {
    vendor_threads?: unknown
    messages?: { vendor_threads?: unknown }
  }
): ThreadVendorEvent {
  // Handle both direct vendor_threads and nested through messages
  const threadData = data.vendor_threads || data.messages?.vendor_threads
  const thread = normalizeJoinResult(threadData)
  if (!thread) {
    throw new Error('Thread not found in data')
  }

  const vendor = normalizeJoinResult((thread as { vendors?: unknown }).vendors)
  if (!vendor) {
    throw new Error('Vendor not found in thread data')
  }

  const event = normalizeJoinResult((vendor as { events?: unknown }).events)
  if (!event) {
    throw new Error('Event not found in vendor data')
  }

  return {
    thread: thread as ThreadVendorEvent['thread'],
    vendor: vendor as ThreadVendorEvent['vendor'],
    event: event as ThreadVendorEvent['event'],
  }
}

// ============================================================================
// Automation History Helpers
// ============================================================================

/**
 * Append a new step to the automation history array.
 * Returns a new array with the step appended.
 */
export function appendAutomationHistory(
  existingHistory: AutomationStep[] | null | undefined,
  type: AutomationStep['type'],
  details: Record<string, unknown>
): AutomationStep[] {
  return [
    ...(existingHistory || []),
    {
      type,
      timestamp: new Date().toISOString(),
      details,
    },
  ]
}

// ============================================================================
// Database Operation Helpers
// ============================================================================

/**
 * Store a message in the messages table.
 */
export async function storeMessage(
  supabase: SupabaseClient,
  data: {
    thread_id: string
    sender: 'SYSTEM' | 'VENDOR' | 'HUMAN'
    body: string
    gmail_message_id?: string | null
    inbound: boolean
  }
): Promise<{ id: string }> {
  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      thread_id: data.thread_id,
      sender: data.sender,
      body: data.body,
      gmail_message_id: data.gmail_message_id || null,
      inbound: data.inbound,
    })
    .select('id')
    .single()

  if (error || !message) {
    throw new Error(`Failed to store message: ${error?.message}`)
  }

  return message
}

/**
 * Log an automation event to the automation_logs table.
 */
export async function logAutomation(
  supabase: SupabaseClient,
  data: {
    event_id: string
    vendor_id: string | null
    event_type: LogEventType
    details: Record<string, unknown>
  }
): Promise<void> {
  const { error } = await supabase.from('automation_logs').insert({
    event_id: data.event_id,
    vendor_id: data.vendor_id,
    event_type: data.event_type,
    details: data.details,
  })

  if (error) {
    console.error('Failed to log automation:', error)
    // Don't throw - logging failures shouldn't break the main flow
  }
}

/**
 * Update a vendor thread's status and related fields.
 */
export async function updateThreadStatus(
  supabase: SupabaseClient,
  threadId: string,
  updates: {
    status?: string
    last_touch?: string
    decision?: string
    reason?: string | null
    escalation_reason?: string | null
    escalation_category?: string | null
    next_action?: string
    automation_history?: AutomationStep[]
    follow_up_count?: number
    gmail_thread_id?: string | null
    confidence?: string
    outreach_approved?: boolean
    outreach_approved_at?: string
    outreach_approved_by?: string
  }
): Promise<void> {
  // Always update last_touch if not explicitly provided and status is changing
  const updateData = {
    ...updates,
    last_touch: updates.last_touch || new Date().toISOString(),
  }

  const { error } = await supabase
    .from('vendor_threads')
    .update(updateData)
    .eq('id', threadId)

  if (error) {
    throw new Error(`Failed to update thread status: ${error.message}`)
  }
}
