import OpenAI from 'openai'
import { Event } from '@/types/database'
import { formatPreferredDates, buildConstraintsList } from '@/lib/utils'
import { generateOutreachEmail } from '@/lib/templates/outreach'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface VendorInfo {
  name: string
  category: string
}

/**
 * Generate a personalized outreach message for a vendor using AI
 */
export async function generateOutreachMessage(
  event: Event,
  vendor: VendorInfo
): Promise<string> {
  const dates = formatPreferredDates(event.preferred_dates)
  const constraints = buildConstraintsList(event.constraints || {})

  const prompt = `Write a professional, personalized outreach email to a venue/vendor for an event inquiry.

Event Details:
- Event name: ${event.name}
- Location: ${event.city}${event.constraints?.neighborhood ? `, ${event.constraints.neighborhood}` : ''}
- Expected guests: ${event.headcount}
- Budget: $${event.venue_budget_ceiling > 0 ? event.venue_budget_ceiling.toLocaleString() : event.total_budget.toLocaleString()}
- Preferred dates (in order of preference):
${dates}
${constraints.length > 0 ? `- Special requirements: ${constraints.join(', ')}` : ''}

Vendor:
- Name: ${vendor.name}
- Category: ${vendor.category}

Guidelines:
1. Be warm but professional
2. Personalize the greeting to the vendor name
3. Clearly state the event details and what you're looking for
4. Ask for availability, pricing, and what's included
5. Mention you're hoping for a quick response
6. Keep it concise (under 200 words)
7. Do NOT include a subject line, just the email body
8. Sign off as "Event Planning Team"

Write the email now:`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert event planner writing professional venue inquiry emails. Write concise, friendly, and effective outreach messages.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    })

    const content = completion.choices[0].message.content
    if (!content) {
      throw new Error('No content returned from AI')
    }

    return content.trim()
  } catch (error) {
    console.error('Error generating outreach message:', error)
    
    // Fall back to template-based message
    return generateFallbackMessage(event, vendor)
  }
}

/**
 * Fallback template-based message if AI fails
 * Reuses the standard outreach template for consistency
 */
function generateFallbackMessage(event: Event, vendor: VendorInfo): string {
  return generateOutreachEmail(event, vendor)
}
