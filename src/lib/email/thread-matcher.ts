import { createClient } from '@/lib/supabase/server'

export async function matchInboundMessage(
  gmailThreadId: string | null,
  fromEmail: string,
  toEmail: string
) {
  const supabase = await createClient()

  // Try to match by gmail_thread_id first
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

    // Update the thread with the gmail_thread_id for future matches
    if (gmailThreadId && thread) {
      await supabase
        .from('vendor_threads')
        .update({ gmail_thread_id: gmailThreadId })
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

export async function getWaitingVendorEmails() {
  const supabase = await createClient()

  const { data: vendors } = await supabase
    .from('vendors')
    .select('contact_email, vendor_threads!inner(status)')
    .eq('vendor_threads.status', 'WAITING')

  if (!vendors) return []

  return vendors.map((v) => v.contact_email)
}
