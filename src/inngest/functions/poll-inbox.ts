import { inngest } from '../client'
import { createClient } from '@/lib/supabase/server'
import {
  listMessages,
  getMessage,
  decodeEmailBody,
  getEmailHeader,
  markAsRead,
} from '@/lib/gmail/operations'
import { matchInboundMessage, getWaitingVendorEmails } from '@/lib/email/thread-matcher'

export const pollInbox = inngest.createFunction(
  {
    id: 'poll-inbox',
    retries: 3,
  },
  { cron: '*/5 * * * *' }, // Every 5 minutes
  async ({ event, step }) => {
    // Get all users with Gmail tokens
    const users = await step.run('fetch-users-with-gmail', async () => {
      const supabase = await createClient()

      const { data: tokens, error } = await supabase
        .from('gmail_tokens')
        .select('user_id')

      if (error) {
        console.error('Error fetching Gmail tokens:', error)
        return []
      }

      return tokens || []
    })

    if (users.length === 0) {
      return { message: 'No users with Gmail tokens found' }
    }

    // Process each user
    for (const { user_id } of users) {
      await step.run(`process-user-${user_id}`, async () => {
        try {
          // Get list of vendor emails we're waiting for
          const vendorEmails = await getWaitingVendorEmails()

          if (vendorEmails.length === 0) {
            return { message: 'No vendors in WAITING status' }
          }

          // Build Gmail query for unread messages from these vendors
          const emailQuery = vendorEmails.map((email) => `from:${email}`).join(' OR ')
          const query = `is:unread (${emailQuery})`

          // List unread messages
          const messages = await listMessages(user_id, query, 50)

          for (const message of messages) {
            if (!message.id) continue

            // Fetch full message
            const fullMessage = await getMessage(user_id, message.id)

            // Extract email headers
            const from = getEmailHeader(fullMessage, 'from') || ''
            const to = getEmailHeader(fullMessage, 'to') || ''
            const subject = getEmailHeader(fullMessage, 'subject') || ''

            // Decode email body
            const body = decodeEmailBody(fullMessage)

            // Extract email address from "Name <email>" format
            const fromEmailMatch = from.match(/<(.+?)>/)
            const fromEmail = fromEmailMatch ? fromEmailMatch[1] : from

            // Match to vendor thread
            const thread = await matchInboundMessage(
              fullMessage.threadId || null,
              fromEmail,
              to
            )

            if (!thread) {
              console.log(`No matching thread found for email from ${fromEmail}`)
              continue
            }

            // Store inbound message
            const supabase = await createClient()
            const { data: storedMessage } = await supabase
              .from('messages')
              .insert({
                thread_id: thread.id,
                sender: 'VENDOR',
                body,
                gmail_message_id: fullMessage.id || null,
                inbound: true,
              })
              .select()
              .single()

            if (!storedMessage) {
              console.error('Failed to store message')
              continue
            }

            // Update thread
            await supabase
              .from('vendor_threads')
              .update({
                status: 'PARSED', // Will be updated after parsing
                last_touch: new Date().toISOString(),
              })
              .eq('id', thread.id)

            // Log the reply
            await supabase.from('automation_logs').insert({
              event_id: thread.vendors.event_id,
              vendor_id: thread.vendors.id,
              event_type: 'REPLY',
              details: {
                from: fromEmail,
                subject,
                gmail_message_id: fullMessage.id,
              },
            })

            // Mark as read (optional)
            try {
              await markAsRead(user_id, message.id)
            } catch (error) {
              console.error('Failed to mark as read:', error)
            }

            // Trigger parsing event
            await inngest.send({
              name: 'message.inbound.new',
              data: {
                messageId: storedMessage.id,
                threadId: thread.id,
                userId: user_id,
              },
            })
          }

          return {
            message: `Processed ${messages.length} messages`,
            userId: user_id,
          }
        } catch (error: any) {
          console.error(`Error processing user ${user_id}:`, error)
          
          // If token refresh fails, skip this user
          if (error.message?.includes('Gmail tokens')) {
            return { error: 'Gmail not connected', userId: user_id }
          }

          throw error
        }
      })
    }

    return { success: true, usersProcessed: users.length }
  }
)
