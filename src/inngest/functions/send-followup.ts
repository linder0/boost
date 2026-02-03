import { inngest } from '../client'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/gmail/operations'
import { generateFollowUp1, generateBreakupEmail, getFollowUpSubject } from '@/lib/templates/followups'
import { normalizeJoinResult } from '@/lib/utils'
import { storeMessage, logAutomation, updateThreadStatus } from '../utils'

export const sendFollowUp = inngest.createFunction(
  {
    id: 'send-followup',
    retries: 2,
  },
  { event: 'followup.scheduled' },
  async (context) => {
    const { event, step } = context
    const { threadId, vendorId, userId, attempt } = event.data

    // Check thread status - skip if vendor replied
    const threadStatus = await step.run('check-thread-status', async () => {
      const supabase = await createClient()

      const { data: thread, error } = await supabase
        .from('vendor_threads')
        .select('*, vendors!inner(*, events!inner(*))')
        .eq('id', threadId)
        .single()

      if (error || !thread) {
        throw new Error(`Thread not found: ${threadId}`)
      }

      return thread as any
    })

    // Skip if vendor has already responded
    if (threadStatus.status !== 'WAITING') {
      return {
        message: 'Vendor already responded, skipping follow-up',
        threadId,
      }
    }

    // Check if we've exceeded max follow-ups
    if (threadStatus.follow_up_count >= 2) {
      return {
        message: 'Max follow-ups reached',
        threadId,
      }
    }

    const vendor = normalizeJoinResult(threadStatus.vendors)!
    const eventData = normalizeJoinResult(vendor.events)!

    // Determine which follow-up to send
    const isBreakup = attempt === 2 || threadStatus.follow_up_count === 1
    const emailBody = isBreakup
      ? generateBreakupEmail(eventData, vendor)
      : generateFollowUp1(eventData, vendor)
    const emailSubject = getFollowUpSubject(eventData, attempt)

    // Send follow-up email
    const sentMessage = await step.run('send-followup-email', async () => {
      return await sendEmail(userId, {
        to: vendor.contact_email,
        subject: emailSubject,
        body: emailBody,
        threadId: threadStatus.gmail_thread_id || undefined,
      })
    })

    // Store message in database
    await step.run('store-followup-message', async () => {
      const supabase = await createClient()

      await storeMessage(supabase, {
        thread_id: threadId,
        sender: 'SYSTEM',
        body: emailBody,
        gmail_message_id: sentMessage.id || null,
        inbound: false,
      })

      // Update thread
      await updateThreadStatus(supabase, threadId, {
        follow_up_count: threadStatus.follow_up_count + 1,
        status: isBreakup ? 'REJECTED' : 'WAITING',
      })
    })

    // Log the follow-up
    await step.run('log-followup', async () => {
      const supabase = await createClient()

      await logAutomation(supabase, {
        event_id: eventData.id,
        vendor_id: vendorId,
        event_type: 'FOLLOW_UP',
        details: {
          attempt: attempt,
          is_breakup: isBreakup,
          subject: emailSubject,
          gmail_message_id: sentMessage.id,
        },
      })
    })

    // Schedule next follow-up if not a breakup
    if (!isBreakup) {
      await step.sendEvent('schedule-next-followup', {
        name: 'followup.scheduled',
        data: {
          threadId,
          vendorId,
          userId,
          attempt: 2,
        },
        ts: Date.now() + 4 * 24 * 60 * 60 * 1000, // 4 days later (total 7 days from initial)
      })
    }

    return {
      success: true,
      messageId: sentMessage.id,
      attempt,
      isBreakup,
    }
  }
)
