import OpenAI from 'openai'
import { Event } from '@/types/database'
import { formatPreferredDates, buildConstraintsList, buildEmailSignature } from '@/lib/utils'
import { generateOutreachEmail } from '@/lib/templates/outreach'
import type { UserProfile } from '@/app/actions/profile'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface VendorInfo {
  name: string
  category: string
}

/**
 * Build user context section for the AI prompt
 */
function buildUserContext(profile: UserProfile | null): string {
  if (!profile) {
    return `Sender:
- Sign off as: Event Planning Team`
  }

  const parts: string[] = []

  // Name and identity
  if (profile.name) {
    parts.push(`- Sender name: ${profile.name}`)
  }
  if (profile.title) {
    parts.push(`- Title: ${profile.title}`)
  }
  if (profile.company_name) {
    parts.push(`- Company: ${profile.company_name}`)
  }
  if (profile.company_description) {
    parts.push(`- About the company: ${profile.company_description}`)
  }

  // Communication preferences
  if (profile.communication_tone) {
    parts.push(`- Preferred tone: ${profile.communication_tone}`)
  }
  if (profile.always_include) {
    parts.push(`- Always mention: ${profile.always_include}`)
  }

  // Additional context
  if (profile.context) {
    parts.push(`- Additional context: ${profile.context}`)
  }

  // Build sign-off using shared utility
  const signOff = buildEmailSignature(profile)
  parts.push(`- Sign off as:\n${signOff}`)

  return `Sender:\n${parts.join('\n')}`
}

/**
 * Get system prompt based on user's communication tone
 */
function getSystemPrompt(tone: string | null): string {
  const toneGuides: Record<string, string> = {
    professional: 'Write professional, polished venue inquiry emails that are clear and business-appropriate.',
    friendly: 'Write warm, personable venue inquiry emails that feel approachable while remaining professional.',
    casual: 'Write relaxed, conversational venue inquiry emails that feel natural and easygoing.',
    formal: 'Write formal, respectful venue inquiry emails with proper business etiquette.',
  }

  const guide = toneGuides[tone || 'professional'] || toneGuides.professional
  return `You are an expert event planner writing venue and vendor inquiry emails. ${guide}`
}

/**
 * Generate a personalized outreach message for a vendor using AI
 */
export async function generateOutreachMessage(
  event: Event,
  vendor: VendorInfo,
  userProfile?: UserProfile | null
): Promise<string> {
  const dates = formatPreferredDates(event.preferred_dates)
  const constraints = buildConstraintsList(event.constraints || {})
  const userContext = buildUserContext(userProfile || null)

  const prompt = `Write a personalized outreach email to a venue/vendor for an event inquiry.

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

${userContext}

Guidelines:
1. Match the sender's preferred tone
2. Personalize the greeting to the vendor name
3. Clearly state the event details and what you're looking for
4. Ask for availability, pricing, and what's included
5. Mention you're hoping for a quick response
6. Keep it concise (under 200 words)
7. Do NOT include a subject line, just the email body
8. Use the sender's name and company in the sign-off (not generic placeholders)
9. Include any information the sender always wants mentioned

Write the email now:`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: getSystemPrompt(userProfile?.communication_tone || null),
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
    return generateFallbackMessage(event, vendor, userProfile)
  }
}

/**
 * Fallback template-based message if AI fails
 * Reuses the standard outreach template for consistency
 */
function generateFallbackMessage(
  event: Event,
  vendor: VendorInfo,
  userProfile?: UserProfile | null
): string {
  const signature = buildEmailSignature(userProfile || null)
  return generateOutreachEmail(event, vendor, signature)
}
