import { inngest } from '../client'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/gmail/operations'
import { generateOutreachEmail, generateOutreachSubject } from '@/lib/templates/outreach'
import { appendAutomationHistory, storeMessage, logAutomation, updateThreadStatus } from '../utils'

export const sendOutreach = inngest.createFunction(
  { id: 'send-outreach' },
  { event: 'vendor.outreach.start' },
  async ({ event, step }) => {
    const { vendorId, userId } = event.data

    // Fetch vendor, thread, and event data
    const vendorData = await step.run('fetch-vendor-data', async () => {
      const supabase = await createClient()

      const { data: vendor, error: vendorError } = await supabase
        .from('vendors')
        .select('*, events(*), vendor_threads(*)')
        .eq('id', vendorId)
        .single()

      if (vendorError || !vendor) {
        throw new Error(`Vendor not found: ${vendorId}`)
      }

      return vendor
    })

    // Check if outreach is approved
    const thread = vendorData.vendor_threads
    if (!thread?.outreach_approved) {
      // Outreach not approved - skip sending
      return {
        success: false,
        skipped: true,
        reason: 'Outreach not approved - waiting for human approval',
        vendorId,
      }
    }

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

    // Store message in database and update thread
    const threadId = await step.run('store-message', async () => {
      const supabase = await createClient()

      // Store the message
      await storeMessage(supabase, {
        thread_id: thread.id,
        sender: 'SYSTEM',
        body: emailBody,
        gmail_message_id: sentMessage.id || null,
        inbound: false,
      })

      // Append to automation history and update thread
      const automationHistory = appendAutomationHistory(
        thread.automation_history,
        'OUTREACH',
        {
          gmail_message_id: sentMessage.id,
          to: vendorData.contact_email,
        }
      )

      await updateThreadStatus(supabase, thread.id, {
        status: 'WAITING',
        gmail_thread_id: sentMessage.threadId || null,
        automation_history: automationHistory,
      })

      return thread.id
    })

    // Log the outreach
    await step.run('log-outreach', async () => {
      const supabase = await createClient()

      await logAutomation(supabase, {
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
    // Follow-ups auto-send (no approval needed) unless escalation occurs
    await step.sendEvent('schedule-followup', {
      name: 'followup.scheduled',
      data: {
        threadId,
        vendorId,
        userId,
        attempt: 1,
      },
      ts: Date.now() + 3 * 24 * 60 * 60 * 1000, // 3 days
    })

    return { success: true, messageId: sentMessage.id }
  }
)
