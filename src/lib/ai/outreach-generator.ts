import OpenAI from 'openai'
import { Event, Vendor } from '@/types/database'
import { formatPreferredDates, buildConstraintsList, buildEmailSignature } from '@/lib/utils'
import { generateOutreachEmail } from '@/lib/templates/outreach'
import type { UserProfile } from '@/app/actions/profile'

// ============================================================================
// Constants
// ============================================================================

const AI_MODEL = 'gpt-4o-mini'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// ============================================================================
// Types
// ============================================================================

export type VendorInfo = Pick<
  Vendor,
  | 'name'
  | 'category'
  | 'cuisine'
  | 'price_per_person'
  | 'website'
  | 'has_private_dining'
  | 'private_dining_capacity_min'
  | 'private_dining_capacity_max'
  | 'private_dining_minimum'
  | 'rating'
  | 'beli_rank'
  | 'address'
  | 'phone'
>

type CommunicationTone = 'professional' | 'friendly' | 'casual' | 'formal'

// ============================================================================
// Shared Helpers
// ============================================================================

/**
 * Format private dining info from a vendor record.
 * Returns null if no private dining data is available.
 */
function formatPrivateDining(vendor: VendorInfo, verbose = false): string | null {
  if (!vendor.has_private_dining) return null

  let result = verbose ? 'Has private dining' : 'Private dining'
  if (vendor.private_dining_capacity_min && vendor.private_dining_capacity_max) {
    const suffix = verbose ? ' guests' : ''
    result += ` (${vendor.private_dining_capacity_min}-${vendor.private_dining_capacity_max}${suffix})`
  }
  return result
}

// ============================================================================
// Context Builders
// ============================================================================

/**
 * Build user context section for the AI prompt.
 */
function buildUserContext(profile: UserProfile | null): string {
  if (!profile) {
    return `Sender:\n- Sign off as: Event Planning Team`
  }

  const parts: string[] = []

  if (profile.name) parts.push(`- Sender name: ${profile.name}`)
  if (profile.title) parts.push(`- Title: ${profile.title}`)
  if (profile.company_name) parts.push(`- Company: ${profile.company_name}`)
  if (profile.company_description) parts.push(`- About the company: ${profile.company_description}`)
  if (profile.communication_tone) parts.push(`- Preferred tone: ${profile.communication_tone}`)
  if (profile.always_include) parts.push(`- Always mention: ${profile.always_include}`)
  if (profile.context) parts.push(`- Additional context: ${profile.context}`)

  const signOff = buildEmailSignature(profile)
  parts.push(`- Sign off as:\n${signOff}`)

  return `Sender:\n${parts.join('\n')}`
}

/**
 * Build vendor details section for the AI prompt.
 * Only includes fields that have values.
 */
function buildVendorContext(vendor: VendorInfo): string {
  const parts: string[] = [
    `- Name: ${vendor.name}`,
    `- Category: ${vendor.category}`,
  ]

  if (vendor.cuisine) parts.push(`- Cuisine: ${vendor.cuisine}`)
  if (vendor.price_per_person) parts.push(`- Known price per person: ${vendor.price_per_person}`)
  if (vendor.website) parts.push(`- Website: ${vendor.website}`)

  const pd = formatPrivateDining(vendor, true)
  if (pd) parts.push(`- ${pd}`)

  if (vendor.private_dining_minimum) {
    parts.push(`- Private dining minimum spend: $${vendor.private_dining_minimum.toLocaleString()}`)
  }
  if (vendor.rating) parts.push(`- Rating: ${vendor.rating}/5`)
  if (vendor.beli_rank) parts.push(`- Beli ranking: #${vendor.beli_rank}`)
  if (vendor.address) parts.push(`- Address: ${vendor.address}`)

  return `Vendor:\n${parts.join('\n')}`
}

// ============================================================================
// System Prompt
// ============================================================================

const TONE_GUIDES: Record<CommunicationTone, string> = {
  professional: 'Write professional, polished venue inquiry emails that are clear and business-appropriate.',
  friendly: 'Write warm, personable venue inquiry emails that feel approachable while remaining professional.',
  casual: 'Write relaxed, conversational venue inquiry emails that feel natural and easygoing.',
  formal: 'Write formal, respectful venue inquiry emails with proper business etiquette.',
}

function getSystemPrompt(tone: string | null): string {
  const guide = TONE_GUIDES[(tone as CommunicationTone)] || TONE_GUIDES.professional
  return `You are an expert event planner writing venue and vendor inquiry emails. ${guide}`
}

// ============================================================================
// Outreach Message Generation
// ============================================================================

/**
 * Generate a personalized outreach message for a vendor using AI.
 */
export async function generateOutreachMessage(
  event: Event,
  vendor: VendorInfo,
  userProfile?: UserProfile | null,
  suggestions?: string | null
): Promise<string> {
  const dates = formatPreferredDates(event.preferred_dates)
  const constraints = buildConstraintsList(event.constraints || {})
  const userContext = buildUserContext(userProfile || null)
  const vendorContext = buildVendorContext(vendor)

  const prompt = `Write a personalized outreach email to a venue/vendor for an event inquiry.

Event Details:
- Event name: ${event.name}
- Location: ${event.city}${event.constraints?.neighborhood ? `, ${event.constraints.neighborhood}` : ''}
- Expected guests: ${event.headcount}
- Budget: $${event.venue_budget_ceiling > 0 ? event.venue_budget_ceiling.toLocaleString() : event.total_budget.toLocaleString()}
- Preferred dates (in order of preference):
${dates}
${constraints.length > 0 ? `- Special requirements: ${constraints.join(', ')}` : ''}

${vendorContext}

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
10. If vendor-specific details are provided (cuisine, private dining, pricing), reference them naturally to show you've done research. Don't force-fit every detail — use what's relevant.
${suggestions ? `\nAdditional instructions from the sender:\n${suggestions}\n` : ''}
Write the email now:`

  try {
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: getSystemPrompt(userProfile?.communication_tone || null) },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) throw new Error(`No content returned from AI for vendor "${vendor.name}"`)

    return content.trim()
  } catch (error) {
    console.error('Error generating outreach message:', error)
    return generateFallbackMessage(event, vendor, userProfile)
  }
}

/**
 * Fallback template-based message if AI fails.
 */
function generateFallbackMessage(
  event: Event,
  vendor: VendorInfo,
  userProfile?: UserProfile | null
): string {
  const signature = buildEmailSignature(userProfile || null)
  return generateOutreachEmail(event, vendor, signature)
}

// ============================================================================
// Vendor Summary Generation
// ============================================================================

/**
 * Compose a summary from available vendor fields (no LLM call).
 * Used as a fallback if AI generation fails.
 */
function composeVendorSummary(vendor: VendorInfo): string {
  const parts: string[] = []

  if (vendor.cuisine) parts.push(vendor.cuisine)
  if (vendor.price_per_person) parts.push(vendor.price_per_person)

  const pd = formatPrivateDining(vendor)
  if (pd) parts.push(pd)

  if (vendor.private_dining_minimum) parts.push(`$${vendor.private_dining_minimum.toLocaleString()} min`)
  if (vendor.rating) parts.push(`${vendor.rating}/5`)

  return parts.length > 0 ? parts.join(' · ') : vendor.category
}

/**
 * Generate a concise one-line summary of a vendor using AI.
 * Used in the vendors table "About" column.
 */
export async function generateVendorSummary(vendor: VendorInfo): Promise<string> {
  const vendorDetails = buildVendorContext(vendor)

  const prompt = `Summarize this vendor in one short line (under 80 characters) for a table cell. Include cuisine type, price range, and any standout details like private dining or high ratings. If information is sparse, summarize what's known concisely.

${vendorDetails}

One-line summary:`

  try {
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You produce ultra-concise vendor summaries for table views. Output only the summary text, no quotes or punctuation wrapping.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 60,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) throw new Error(`No content returned from AI for vendor "${vendor.name}"`)

    return content.trim()
  } catch (error) {
    console.error('Error generating vendor summary:', error)
    return composeVendorSummary(vendor)
  }
}
