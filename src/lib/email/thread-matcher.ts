import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Match an inbound message to a vendor thread.
 * Tries agentmail_thread_id first, then gmail_thread_id, then vendor email.
 *
 * Accepts a Supabase client so it works in both cookie-based (server actions)
 * and service-role (webhook) contexts.
 */
export async function matchInboundMessage(
  supabase: SupabaseClient,
  agentmailThreadId: string | null,
  gmailThreadId: string | null,
  fromEmail: string,
) {

  // Try to match by agentmail_thread_id first
  if (agentmailThreadId) {
    const { data: thread } = await supabase
      .from('vendor_threads')
      .select('*, vendors(*)')
      .eq('agentmail_thread_id', agentmailThreadId)
      .single()

    if (thread) {
      return thread
    }
  }

  // Try to match by gmail_thread_id (legacy)
  if (gmailThreadId) {
    const { data: thread } = await supabase
      .from('vendor_threads')
      .select('*, vendors(*)')
      .eq('gmail_thread_id', gmailThreadId)
      .single()

    if (thread) {
      return thread
    }
  }

  // Fallback: match by vendor email
  const { data: vendor } = await supabase
    .from('vendors')
    .select('*, vendor_threads(*)')
    .ilike('contact_email', fromEmail)
    .single()

  if (vendor && vendor.vendor_threads) {
    const thread = Array.isArray(vendor.vendor_threads)
      ? vendor.vendor_threads[0]
      : vendor.vendor_threads

    // Store the agentmail_thread_id for future matches
    if (agentmailThreadId && thread) {
      await supabase
        .from('vendor_threads')
        .update({ agentmail_thread_id: agentmailThreadId })
        .eq('id', thread.id)
    }

    return {
      ...thread,
      vendors: vendor,
    }
  }

  // No match found
  return null
}
