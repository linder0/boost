import OpenAI from 'openai'
import { z } from 'zod'
import { zodResponseFormat } from 'openai/helpers/zod'
import { Event } from '@/types/database'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const AvailabilitySchema = z.object({
  date: z.string().describe('Date in YYYY-MM-DD format'),
  time: z.string().optional().describe('Time if specified, e.g. "2:00 PM"'),
  capacity: z.number().optional().describe('Maximum capacity if mentioned'),
})

const QuoteBreakdownSchema = z.object({
  item: z.string().describe('Item or service name'),
  amount: z.number().describe('Amount in dollars'),
})

const QuoteSchema = z.object({
  amount: z.number().describe('Total quoted amount in dollars'),
  currency: z.string().default('USD').describe('Currency code'),
  breakdown: z.array(QuoteBreakdownSchema).describe('Itemized breakdown if provided'),
})

const ParsedResponseSchema = z.object({
  availability: z.array(AvailabilitySchema).describe('Available dates mentioned in the email'),
  quote: QuoteSchema.nullable().describe('Pricing information if provided'),
  inclusions: z.array(z.string()).describe('What is included in the package or service'),
  questions: z.array(z.string()).describe('Questions the vendor asked that need answers'),
  sentiment: z.enum(['positive', 'neutral', 'negative']).describe('Overall tone of the response'),
  confidence: z.enum(['high', 'medium', 'low']).describe('How clear and complete the response is'),
  summary: z.string().describe('Brief summary of the vendor response'),
})

export type ParsedVendorResponse = z.infer<typeof ParsedResponseSchema>

export async function parseVendorEmail(
  emailBody: string,
  eventContext: Event
): Promise<ParsedVendorResponse> {
  const preferredDates = eventContext.preferred_dates
    .map((d) => d.date)
    .join(', ')

  const prompt = `You are analyzing a vendor's email response to an event inquiry. Extract structured information from the email.

Event Context:
- Event: ${eventContext.name}
- Location: ${eventContext.city}
- Headcount: ${eventContext.headcount} guests
- Budget: $${eventContext.venue_budget_ceiling} (venue ceiling)
- Preferred dates: ${preferredDates}

Vendor Email:
${emailBody}

Extract:
1. Available dates - Any dates the vendor confirms availability for
2. Quote - Pricing information with breakdown if itemized
3. Inclusions - What's included in their service/package
4. Questions - Any questions they're asking that need our response
5. Sentiment - positive (enthusiastic/helpful), neutral (professional/factual), negative (declining/difficult)
6. Confidence - high (clear pricing and dates), medium (some info missing), low (vague or needs clarification)
7. Summary - One sentence summary of their response

If information is not provided, use empty arrays or null for quote.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-2024-08-06',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at extracting structured information from vendor email responses.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'parsed_response',
          schema: {
            type: 'object',
            properties: {
              availability: { type: 'array', items: { type: 'object' } },
              quote: { type: 'object', nullable: true },
              inclusions: { type: 'array', items: { type: 'string' } },
              questions: { type: 'array', items: { type: 'string' } },
              sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
              confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
              summary: { type: 'string' },
            },
            required: ['availability', 'quote', 'inclusions', 'questions', 'sentiment', 'confidence', 'summary'],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    })

    const content = completion.choices[0].message.content
    if (!content) {
      throw new Error('Failed to parse response')
    }

    const parsed = JSON.parse(content) as ParsedVendorResponse
    return parsed
  } catch (error) {
    console.error('Error parsing vendor email:', error)

    // Return low confidence fallback
    return {
      availability: [],
      quote: null,
      inclusions: [],
      questions: ['Unable to parse email - manual review needed'],
      sentiment: 'neutral',
      confidence: 'low',
      summary: 'Failed to automatically parse vendor response',
    }
  }
}

export function calculateConfidenceScore(parsed: ParsedVendorResponse): 'high' | 'medium' | 'low' {
  // Already have confidence from parsing, but can refine it
  if (parsed.confidence === 'low') return 'low'

  // Check if we have critical information
  const hasAvailability = parsed.availability.length > 0
  const hasQuote = parsed.quote !== null
  const hasQuestions = parsed.questions.length > 0

  if (hasAvailability && hasQuote && !hasQuestions) {
    return 'high'
  }

  if ((hasAvailability || hasQuote) && hasQuestions) {
    return 'medium'
  }

  if (!hasAvailability && !hasQuote) {
    return 'low'
  }

  return parsed.confidence
}
