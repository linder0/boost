import { getAgentMailClient } from './client'

/**
 * Send an email via AgentMail.
 * If threadId is provided, fetches the latest message in that thread and replies to it.
 * Otherwise creates a new message (and thread).
 */
export async function sendEmail(
  inboxId: string,
  params: {
    to: string
    subject: string
    body: string
    threadId?: string // AgentMail thread ID for threading follow-ups
  }
): Promise<{ id: string; threadId: string }> {
  const client = getAgentMailClient()

  if (params.threadId) {
    // Get the thread to find the latest message to reply to
    try {
      const thread = await client.inboxes.threads.get(inboxId, params.threadId)
      const messages = thread.messages ?? []
      const lastMessage = messages[messages.length - 1]

      if (lastMessage?.messageId) {
        const msg = await client.inboxes.messages.reply(
          inboxId,
          lastMessage.messageId,
          {
            to: params.to,
            text: params.body,
          }
        )
        return { id: msg.messageId, threadId: params.threadId }
      }
    } catch (err) {
      console.error('[agentmail] Failed to reply in thread, sending as new message:', err)
    }
  }

  // New message (creates new thread) or fallback if reply failed
  const msg = await client.inboxes.messages.send(inboxId, {
    to: params.to,
    subject: params.subject,
    text: params.body,
  })
  return { id: msg.messageId, threadId: msg.threadId }
}
