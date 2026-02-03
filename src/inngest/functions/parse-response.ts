import { inngest } from '../client'
import { createClient } from '@/lib/supabase/server'
import { parseVendorEmail, calculateConfidenceScore } from '@/lib/ai/parser'
import { extractThreadVendorEvent, logAutomation, updateThreadStatus } from '../utils'

export const parseResponse = inngest.createFunction(
  {
    id: 'parse-response',
    retries: 2,
  },
  { event: 'message.inbound.new' },
  async ({ event, step }) => {
    const { messageId, threadId, userId } = event.data

    // Fetch message and event context
    const data = await step.run('fetch-message-context', async () => {
      const supabase = await createClient()

      const { data: message, error: messageError } = await supabase
        .from('messages')
        .select(`
          *,
          vendor_threads!inner(
            *,
            vendors!inner(
              *,
              events!inner(*)
            )
          )
        `)
        .eq('id', messageId)
        .single()

      if (messageError || !message) {
        throw new Error(`Message not found: ${messageId}`)
      }

      return message
    })

    // Parse the email using OpenAI
    const parsed = await step.run('parse-with-openai', async () => {
      const { event } = extractThreadVendorEvent(data)
      return await parseVendorEmail(data.body, event)
    })

    // Calculate final confidence score
    const confidence = calculateConfidenceScore(parsed)

    // Store parsed response
    const parsedResponseId = await step.run('store-parsed-response', async () => {
      const supabase = await createClient()

      const { data: parsedResponse, error } = await supabase
        .from('parsed_responses')
        .insert({
          message_id: messageId,
          availability: parsed.availability,
          quote: parsed.quote,
          inclusions: parsed.inclusions,
          questions: parsed.questions,
          sentiment: parsed.sentiment,
          confidence: confidence.toUpperCase(),
          raw_data: parsed,
        })
        .select()
        .single()

      if (error || !parsedResponse) {
        throw new Error('Failed to store parsed response')
      }

      return parsedResponse.id
    })

    // Update thread confidence
    await step.run('update-thread-confidence', async () => {
      const supabase = await createClient()
      await updateThreadStatus(supabase, threadId, {
        confidence: confidence.toUpperCase(),
      })
    })

    // Log the parsing
    await step.run('log-parsing', async () => {
      const supabase = await createClient()
      const { vendor } = extractThreadVendorEvent(data)

      await logAutomation(supabase, {
        event_id: vendor.event_id,
        vendor_id: vendor.id,
        event_type: 'PARSE',
        details: {
          confidence,
          has_availability: parsed.availability.length > 0,
          has_quote: parsed.quote !== null,
          has_questions: parsed.questions.length > 0,
          summary: parsed.summary,
        },
      })
    })

    // Trigger decision event
    await step.sendEvent('trigger-decision', {
      name: 'message.parsed',
      data: {
        parsedResponseId,
        messageId,
        threadId,
        userId,
      },
    })

    return {
      success: true,
      parsedResponseId,
      confidence,
      summary: parsed.summary,
    }
  }
)
