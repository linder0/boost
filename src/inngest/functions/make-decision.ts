import { inngest } from '../client'
import { createClient } from '@/lib/supabase/server'
import { evaluateVendor } from '@/lib/rules/decision-engine'
import { sendEmail } from '@/lib/gmail/operations'

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
      const thread = Array.isArray(data.messages.vendor_threads)
        ? data.messages.vendor_threads[0]
        : data.messages.vendor_threads
      const vendor = thread.vendors
      const event = vendor.events

      return evaluateVendor(data.raw_data, event)
    })

    // Store decision
    const decisionId = await step.run('store-decision', async () => {
      const supabase = await createClient()

      const { data: storedDecision, error } = await supabase
        .from('decisions')
        .insert({
          parsed_response_id: parsedResponseId,
          outcome: decision.outcome,
          reason: decision.reason,
          proposed_next_action: decision.proposedNextAction,
        })
        .select()
        .single()

      if (error || !storedDecision) {
        throw new Error('Failed to store decision')
      }

      return storedDecision.id
    })

    // Update thread with decision
    await step.run('update-thread-status', async () => {
      const supabase = await createClient()

      const newStatus = decision.shouldEscalate
        ? 'ESCALATION'
        : decision.outcome === 'VIABLE'
        ? 'VIABLE'
        : decision.outcome === 'REJECT'
        ? 'REJECTED'
        : 'WAITING'

      await supabase
        .from('vendor_threads')
        .update({
          status: newStatus,
          decision: decision.outcome,
          reason: decision.reason,
          escalation_reason: decision.shouldEscalate ? decision.reason : null,
          next_action: decision.shouldEscalate ? 'NEEDS_YOU' : 'AUTO',
        })
        .eq('id', threadId)
    })

    // Log the decision
    await step.run('log-decision', async () => {
      const supabase = await createClient()

      const thread = Array.isArray(data.messages.vendor_threads)
        ? data.messages.vendor_threads[0]
        : data.messages.vendor_threads
      const vendor = thread.vendors

      await supabase.from('automation_logs').insert({
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
        const thread = Array.isArray(data.messages.vendor_threads)
          ? data.messages.vendor_threads[0]
          : data.messages.vendor_threads
        const vendor = thread.vendors
        const supabase = await createClient()

        // Ensure we have a message body
        if (!decision.proposedNextAction) {
          throw new Error('No proposed action message available')
        }

        // Send email
        const sentMessage = await sendEmail(userId, {
          to: vendor.contact_email,
          subject: `Re: Inquiry - ${vendor.events.name}`,
          body: decision.proposedNextAction,
          threadId: thread.gmail_thread_id || undefined,
        })

        // Store message
        await supabase.from('messages').insert({
          thread_id: threadId,
          sender: 'SYSTEM',
          body: decision.proposedNextAction,
          gmail_message_id: sentMessage.id || null,
          inbound: false,
        })

        // Update last touch
        await supabase
          .from('vendor_threads')
          .update({
            last_touch: new Date().toISOString(),
          })
          .eq('id', threadId)
      })
    }

    // Trigger escalation notification if needed
    if (decision.shouldEscalate) {
      await step.sendEvent('escalation-triggered', {
        name: 'vendor.escalation',
        data: {
          threadId,
          vendorId: data.messages.vendor_threads.vendor_id,
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
