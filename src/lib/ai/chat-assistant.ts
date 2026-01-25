import OpenAI from 'openai'
import { Event, VendorWithThread, ChatMessage } from '@/types/database'
import { formatCurrency } from '@/lib/utils'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface ChatContext {
  event: Event
  vendors: VendorWithThread[]
  chatHistory: ChatMessage[]
}

function buildSystemPrompt(context: ChatContext): string {
  const { event, vendors } = context

  // Format preferred dates
  const dates = event.preferred_dates
    ?.map((d, i) => `${i + 1}. ${d.date}`)
    .join('\n') || 'None set'

  // Format constraints
  const constraints: string[] = []
  if (event.constraints?.indoor_outdoor && event.constraints.indoor_outdoor !== 'either') {
    constraints.push(`Indoor/Outdoor: ${event.constraints.indoor_outdoor}`)
  }
  if (event.constraints?.venue_types?.length) {
    constraints.push(`Venue types: ${event.constraints.venue_types.join(', ')}`)
  }
  if (event.constraints?.neighborhood) {
    constraints.push(`Neighborhood: ${event.constraints.neighborhood}`)
  }
  if (event.constraints?.time_frame) {
    constraints.push(`Time: ${event.constraints.time_frame}`)
  }
  if (event.constraints?.catering?.food) {
    constraints.push('Needs food catering')
  }
  if (event.constraints?.catering?.drinks) {
    constraints.push('Needs drinks/bar service')
  }

  // Format vendor summary
  const vendorsByStatus: Record<string, string[]> = {}
  vendors.forEach((v) => {
    const status = v.vendor_threads?.status || 'NOT_CONTACTED'
    if (!vendorsByStatus[status]) {
      vendorsByStatus[status] = []
    }
    vendorsByStatus[status].push(v.name)
  })

  const vendorSummary = Object.entries(vendorsByStatus)
    .map(([status, names]) => `- ${status}: ${names.join(', ')}`)
    .join('\n') || 'No vendors added yet'

  // Build vendor details for more context
  const vendorDetails = vendors
    .map((v) => {
      const thread = v.vendor_threads
      let detail = `- ${v.name} (${v.category}): ${thread?.status || 'NOT_CONTACTED'}`
      if (thread?.decision) {
        detail += ` | Decision: ${thread.decision}`
      }
      if (thread?.reason) {
        detail += ` | Reason: ${thread.reason}`
      }
      if (thread?.escalation_reason) {
        detail += ` | Escalation: ${thread.escalation_reason}`
      }
      return detail
    })
    .join('\n') || 'No vendors yet'

  return `You are a helpful AI assistant for event planning. You have access to information about the user's event and can help them manage it effectively.

## Event Information

**Name:** ${event.name}
**Location:** ${event.city}${event.constraints?.neighborhood ? `, ${event.constraints.neighborhood}` : ''}
**Address:** ${event.location_address || 'Not set'}
**Guest Count:** ${event.headcount} people
**Budget:** ${formatCurrency(event.total_budget)}
**Venue Budget Ceiling:** ${formatCurrency(event.venue_budget_ceiling)}

**Preferred Dates:**
${dates}

**Requirements:**
${constraints.length > 0 ? constraints.join('\n') : 'None specified'}

## Vendors (${vendors.length} total)

**Status Summary:**
${vendorSummary}

**Vendor Details:**
${vendorDetails}

## Your Capabilities

1. **Answer Questions**: Provide information about the event, vendors, and their statuses
2. **Give Recommendations**: Suggest next steps based on vendor responses and event requirements
3. **Summarize Progress**: Provide an overview of where things stand with vendor outreach
4. **Offer Insights**: Analyze vendor responses and help compare options

## Guidelines

- Be concise but helpful
- Reference specific vendor names and their statuses when relevant
- If asked about something you don't have data for, say so clearly
- Focus on being actionable - suggest concrete next steps when appropriate
- Use the event details to provide context-aware responses
- When comparing vendors, consider budget, availability, and requirements match`
}

function buildMessages(
  systemPrompt: string,
  chatHistory: ChatMessage[],
  userMessage: string
): OpenAI.ChatCompletionMessageParam[] {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
  ]

  // Add chat history (last 20 messages to keep context manageable)
  const recentHistory = chatHistory.slice(-20)
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })
  }

  // Add current user message
  messages.push({ role: 'user', content: userMessage })

  return messages
}

export async function streamChatResponse(
  context: ChatContext,
  userMessage: string
): Promise<ReadableStream<Uint8Array>> {
  const systemPrompt = buildSystemPrompt(context)
  const messages = buildMessages(systemPrompt, context.chatHistory, userMessage)

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    stream: true,
    temperature: 0.7,
    max_tokens: 1000,
  })

  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of response) {
          const content = chunk.choices[0]?.delta?.content
          if (content) {
            controller.enqueue(encoder.encode(content))
          }
        }
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    },
  })
}

export async function getChatResponse(
  context: ChatContext,
  userMessage: string
): Promise<string> {
  const systemPrompt = buildSystemPrompt(context)
  const messages = buildMessages(systemPrompt, context.chatHistory, userMessage)

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    temperature: 0.7,
    max_tokens: 1000,
  })

  return response.choices[0]?.message?.content || 'Sorry, I could not generate a response.'
}
