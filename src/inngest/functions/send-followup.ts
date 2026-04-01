import { inngest } from '../client'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/agentmail/operations'
import { getUserInboxId } from '@/lib/agentmail/inbox'
import { generateFollowUp1, generateBreakupEmail, getFollowUpSubject } from '@/lib/templates/followups'
import { normalizeJoinResult } from '@/lib/utils'
import {
  storeMessage, logAutomation, updateThreadStatus,
  BREAKUP_FOLLOWUP_DELAY_DAYS, daysToMs,
} from '../utils'

export const sendFollowUp = inngest.createFunction(
  {
    id: 'send-followup',
    retries: 2,
  },
  { event: 'followup.scheduled' },
  async ({ event, step }) => {
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // Get user's AgentMail inbox
    const inboxId = await step.run('get-inbox', async () => {
      const id = await getUserInboxId(userId)
      if (!id) throw new Error(`No AgentMail inbox found for user ${userId}`)
      return id
    })

    // Send follow-up email via AgentMail
    const sentMessage = await step.run('send-followup-email', async () => {
      return await sendEmail(inboxId, {
        to: vendor.contact_email,
        subject: emailSubject,
        body: emailBody,
        threadId: threadStatus.agentmail_thread_id || undefined,
      })
    })

    // Store message in database
    await step.run('store-followup-message', async () => {
      const supabase = await createClient()

      await storeMessage(supabase, {
        thread_id: threadId,
        sender: 'SYSTEM',
        body: emailBody,
        agentmail_message_id: sentMessage.id || null,
        inbound: false,
      })

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
          agentmail_message_id: sentMessage.id,
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
        ts: Date.now() + daysToMs(BREAKUP_FOLLOWUP_DELAY_DAYS),
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
