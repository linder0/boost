import { inngest } from '../client'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/gmail/operations'
import { generateOutreachEmail, generateOutreachSubject } from '@/lib/templates/outreach'

export const sendOutreach = inngest.createFunction(
  { id: 'send-outreach' },
  { event: 'vendor.outreach.start' },
  async ({ event, step }) => {
    const { vendorId, userId } = event.data

    // Fetch vendor and event data
    const vendorData = await step.run('fetch-vendor-data', async () => {
      const supabase = await createClient()
      
      const { data: vendor, error: vendorError } = await supabase
        .from('vendors')
        .select('*, events(*)')
        .eq('id', vendorId)
        .single()

      if (vendorError || !vendor) {
        throw new Error(`Vendor not found: ${vendorId}`)
      }

      return vendor
    })

    // Use custom message if available, otherwise generate from template
    const emailBody = vendorData.custom_message || generateOutreachEmail(vendorData.events, vendorData)
    const emailSubject = generateOutreachSubject(vendorData.events)

    // Send email via Gmail
    const sentMessage = await step.run('send-email', async () => {
      return await sendEmail(userId, {
        to: vendorData.contact_email,
        subject: emailSubject,
        body: emailBody,
      })
    })

    // Store message in database
    await step.run('store-message', async () => {
      const supabase = await createClient()

      // Get or create vendor thread
      const { data: thread } = await supabase
        .from('vendor_threads')
        .select('id')
        .eq('vendor_id', vendorId)
        .single()

      if (!thread) {
        throw new Error(`Thread not found for vendor: ${vendorId}`)
      }

      // Store the message
      await supabase.from('messages').insert({
        thread_id: thread.id,
        sender: 'SYSTEM',
        body: emailBody,
        gmail_message_id: sentMessage.id || null,
        inbound: false,
      })

      // Update thread status
      await supabase
        .from('vendor_threads')
        .update({
          status: 'WAITING',
          last_touch: new Date().toISOString(),
          gmail_thread_id: sentMessage.threadId || null,
        })
        .eq('id', thread.id)

      return thread.id
    })

    // Log the outreach
    await step.run('log-outreach', async () => {
      const supabase = await createClient()
      
      await supabase.from('automation_logs').insert({
        event_id: vendorData.event_id,
        vendor_id: vendorId,
        event_type: 'OUTREACH',
        details: {
          to: vendorData.contact_email,
          subject: emailSubject,
          gmail_message_id: sentMessage.id,
        },
      })
    })

    // Schedule follow-up for 3 business days later
    await step.sendEvent('schedule-followup', {
      name: 'followup.scheduled',
      data: {
        threadId: vendorData.vendor_threads?.[0]?.id || '',
        vendorId,
        userId,
        attempt: 1,
      },
      ts: Date.now() + 3 * 24 * 60 * 60 * 1000, // 3 days
    })

    return { success: true, messageId: sentMessage.id }
  }
)
