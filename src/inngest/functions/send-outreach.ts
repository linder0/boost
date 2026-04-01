import { inngest } from '../client'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/agentmail/operations'
import { ensureUserInbox } from '@/lib/agentmail/inbox'
import { generateOutreachEmail, generateOutreachSubject } from '@/lib/templates/outreach'
import {
  appendAutomationHistory, storeMessage, logAutomation, updateThreadStatus,
  FIRST_FOLLOWUP_DELAY_DAYS, daysToMs,
} from '../utils'

export const sendOutreach = inngest.createFunction(
  { id: 'send-outreach', retries: 2 },
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
      return {
        success: false,
        skipped: true,
        reason: 'Outreach not approved - waiting for human approval',
        vendorId,
      }
    }

    // Ensure user has an AgentMail inbox
    const inboxId = await step.run('ensure-inbox', async () => {
      const supabase = await createClient()
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('name')
        .eq('user_id', userId)
        .single()

      return await ensureUserInbox(userId, profile?.name || 'VROOM Planner')
    })

    // Use custom message if available, otherwise generate from template
    const emailBody = vendorData.custom_message || generateOutreachEmail(vendorData.events, vendorData)
    const emailSubject = generateOutreachSubject(vendorData.events)

    // Send email via AgentMail
    const sentMessage = await step.run('send-email', async () => {
      return await sendEmail(inboxId, {
        to: vendorData.contact_email,
        subject: emailSubject,
        body: emailBody,
      })
    })

    // Store message in database and update thread
    const threadId = await step.run('store-message', async () => {
      const supabase = await createClient()

      await storeMessage(supabase, {
        thread_id: thread.id,
        sender: 'SYSTEM',
        body: emailBody,
        agentmail_message_id: sentMessage.id || null,
        inbound: false,
      })

      const automationHistory = appendAutomationHistory(
        thread.automation_history,
        'OUTREACH',
        {
          agentmail_message_id: sentMessage.id,
          to: vendorData.contact_email,
        }
      )

      await updateThreadStatus(supabase, thread.id, {
        status: 'WAITING',
        agentmail_thread_id: sentMessage.threadId || null,
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
          agentmail_message_id: sentMessage.id,
        },
      })
    })

    // Schedule follow-up for 3 business days later
    await step.sendEvent('schedule-followup', {
      name: 'followup.scheduled',
      data: {
        threadId,
        vendorId,
        userId,
        attempt: 1,
      },
      ts: Date.now() + daysToMs(FIRST_FOLLOWUP_DELAY_DAYS),
    })

    return { success: true, messageId: sentMessage.id }
  }
)
