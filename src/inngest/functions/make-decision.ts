import { inngest } from '../client'
import { createClient } from '@/lib/supabase/server'
import { evaluateVendor } from '@/lib/rules/decision-engine'
import { sendEmail } from '@/lib/gmail/operations'
import {
  extractThreadVendorEvent,
  appendAutomationHistory,
  storeMessage,
  logAutomation,
  updateThreadStatus
} from '../utils'

export const makeDecision = inngest.createFunction(
  {
    id: 'make-decision',
    retries: 2,
  },
  { event: 'message.parsed' },
  async ({ event, step }) => {
    const { parsedResponseId, messageId, threadId, userId } = event.data

    // Fetch parsed response and event constraints
    const data = await step.run('fetch-decision-context', async () => {
      const supabase = await createClient()

      const { data: parsedResponse, error } = await supabase
        .from('parsed_responses')
        .select(`
          *,
          messages!inner(
            *,
            vendor_threads!inner(
              *,
              vendors!inner(
                *,
                events!inner(*)
              )
            )
          )
        `)
        .eq('id', parsedResponseId)
        .single()

      if (error || !parsedResponse) {
        throw new Error(`Parsed response not found: ${parsedResponseId}`)
      }

      return parsedResponse
    })

    // Run decision engine
    const decision = await step.run('evaluate-vendor', async () => {
      const { event } = extractThreadVendorEvent(data)
      return evaluateVendor(data.raw_data, event)
    })

    // Store decision with suggested actions
    const decisionId = await step.run('store-decision', async () => {
      const supabase = await createClient()

      const { data: storedDecision, error } = await supabase
        .from('decisions')
        .insert({
          parsed_response_id: parsedResponseId,
          outcome: decision.outcome,
          reason: decision.reason,
          proposed_next_action: decision.proposedNextAction,
          suggested_actions: decision.suggestedActions,
        })
        .select()
        .single()

      if (error || !storedDecision) {
        throw new Error('Failed to store decision')
      }

      return storedDecision.id
    })

    // Update thread with decision and escalation context
    await step.run('update-thread-status', async () => {
      const supabase = await createClient()
      const { thread } = extractThreadVendorEvent(data)

      const newStatus = decision.shouldEscalate
        ? 'ESCALATION'
        : decision.outcome === 'VIABLE'
        ? 'VIABLE'
        : decision.outcome === 'REJECT'
        ? 'REJECTED'
        : 'WAITING'

      const automationHistory = appendAutomationHistory(
        thread.automation_history,
        'DECISION',
        {
          outcome: decision.outcome,
          reason: decision.reason,
          should_escalate: decision.shouldEscalate,
        }
      )

      await updateThreadStatus(supabase, threadId, {
        status: newStatus,
        decision: decision.outcome,
        reason: decision.reason,
        escalation_reason: decision.shouldEscalate ? decision.reason : null,
        escalation_category: decision.escalationCategory,
        next_action: decision.shouldEscalate ? 'NEEDS_YOU' : 'AUTO',
        automation_history: automationHistory,
      })
    })

    // Log the decision
    await step.run('log-decision', async () => {
      const supabase = await createClient()
      const { vendor } = extractThreadVendorEvent(data)

      await logAutomation(supabase, {
        event_id: vendor.event_id,
        vendor_id: vendor.id,
        event_type: 'DECISION',
        details: {
          outcome: decision.outcome,
          reason: decision.reason,
          should_escalate: decision.shouldEscalate,
          should_auto_respond: decision.shouldAutoRespond,
        },
      })
    })

    // Send auto-response if applicable
    if (decision.shouldAutoRespond && decision.proposedNextAction) {
      await step.run('send-auto-response', async () => {
        const { thread, vendor, event: eventData } = extractThreadVendorEvent(data)
        const supabase = await createClient()

        // Ensure we have a message body
        if (!decision.proposedNextAction) {
          throw new Error('No proposed action message available')
        }

        // Send email
        const sentMessage = await sendEmail(userId, {
          to: vendor.contact_email,
          subject: `Re: Inquiry - ${eventData.name}`,
          body: decision.proposedNextAction,
          threadId: thread.gmail_thread_id || undefined,
        })

        // Store message
        await storeMessage(supabase, {
          thread_id: threadId,
          sender: 'SYSTEM',
          body: decision.proposedNextAction,
          gmail_message_id: sentMessage.id || null,
          inbound: false,
        })

        // Update last touch
        await updateThreadStatus(supabase, threadId, {})
      })
    }

    // Trigger escalation notification if needed
    if (decision.shouldEscalate) {
      const { thread } = extractThreadVendorEvent(data)
      await step.sendEvent('escalation-triggered', {
        name: 'vendor.escalation',
        data: {
          threadId,
          vendorId: thread.vendor_id,
          userId,
          reason: decision.reason,
        },
      })
    }

    return {
      success: true,
      decisionId,
      outcome: decision.outcome,
      shouldEscalate: decision.shouldEscalate,
    }
  }
)
