import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { inngest } from '@/inngest/client'
import { storeMessage, logAutomation, updateThreadStatus } from '@/inngest/utils'
import { matchInboundMessage } from '@/lib/email/thread-matcher'
import { normalizeJoinResult, extractEmail } from '@/lib/utils'

/**
 * AgentMail webhook handler.
 * Receives inbound vendor replies and feeds them into the existing
 * parse-response → make-decision pipeline via Inngest.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Webhook signature verification (Svix) is skipped for now; enable before production.
    // const svixId = request.headers.get('svix-id')
    // const svixTimestamp = request.headers.get('svix-timestamp')
    // const svixSignature = request.headers.get('svix-signature')

    const eventType = body.type || body.event_type

    // Only handle message.received events
    if (eventType !== 'message.received') {
      return NextResponse.json({ ok: true, skipped: true })
    }

    const message = body.data || body.payload || body
    const inboxId = message.inbox_id || message.inboxId
    const agentmailThreadId = message.thread_id || message.threadId
    const agentmailMessageId = message.message_id || message.messageId
    const fromEmail = extractEmail(message.from)
    const emailBody = message.text || message.body || ''
    const subject = message.subject || ''

    if (!fromEmail) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'no from email' })
    }

    const supabase = createServiceRoleClient()

    // Match to vendor thread using shared matcher
    const matched = await matchInboundMessage(supabase, agentmailThreadId, null, fromEmail)

    if (!matched) {
      console.warn(`[agentmail-webhook] No matching thread for email from ${fromEmail}`)
      return NextResponse.json({ ok: true, skipped: true, reason: 'no matching thread' })
    }

    const thread = matched
    const vendor = normalizeJoinResult(matched.vendors)

    // Store the inbound message
    const storedMessage = await storeMessage(supabase, {
      thread_id: thread.id,
      sender: 'VENDOR',
      body: emailBody,
      agentmail_message_id: agentmailMessageId || null,
      inbound: true,
    })

    // Update thread status
    await updateThreadStatus(supabase, thread.id, {
      status: 'PARSED',
    })

    // Log the reply
    await logAutomation(supabase, {
      event_id: vendor.event_id,
      vendor_id: vendor.id,
      event_type: 'REPLY',
      details: {
        from: fromEmail,
        subject,
        agentmail_message_id: agentmailMessageId,
      },
    })

    // Look up the user who owns this event to pass userId to Inngest
    const { data: event } = await supabase
      .from('events')
      .select('user_id')
      .eq('id', vendor.event_id)
      .single()

    // Trigger the parse-response pipeline
    await inngest.send({
      name: 'message.inbound.new',
      data: {
        messageId: storedMessage.id,
        threadId: thread.id,
        userId: event?.user_id || '',
      },
    })

    return NextResponse.json({ ok: true, messageId: storedMessage.id })
  } catch (error) {
    console.error('[agentmail-webhook] Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
