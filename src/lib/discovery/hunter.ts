/**
 * Hunter.io API integration for email discovery
 * Uses the Domain Search API to find contact emails from venue websites
 */

const HUNTER_API_KEY = process.env.HUNTER_API_KEY

export interface HunterEmailResult {
  email: string
  confidence: number
  firstName?: string
  lastName?: string
  position?: string
  type: 'personal' | 'generic'
}

interface HunterDomainSearchResponse {
  data: {
    domain: string
    disposable: boolean
    webmail: boolean
    accept_all: boolean
    pattern?: string
    organization?: string
    emails: Array<{
      value: string
      type: 'personal' | 'generic'
      confidence: number
      first_name?: string
      last_name?: string
      position?: string
    }>
  }
  meta: {
    results: number
    limit: number
    offset: number
  }
}

// Email prefixes we prefer for event-related inquiries
const PREFERRED_EMAIL_PREFIXES = [
  'events',
  'event',
  'private',
  'bookings',
  'booking',
  'reservations',
  'reservation',
  'info',
  'contact',
  'hello',
  'inquiries',
  'inquiry',
]

import { extractDomain } from './utils'

/**
 * Score an email based on how relevant it is for event inquiries
 */
function scoreEmail(email: string): number {
  const localPart = email.split('@')[0].toLowerCase()
  const prefixIndex = PREFERRED_EMAIL_PREFIXES.findIndex(
    (prefix) => localPart.startsWith(prefix) || localPart === prefix
  )
  
  if (prefixIndex !== -1) {
    // Higher score for earlier prefixes in our list (events > info > contact, etc.)
    return 100 - prefixIndex
  }
  return 0
}

/**
 * Find the best email for a venue given its website URL
 */
export async function findEmail(
  websiteUrl: string
): Promise<HunterEmailResult | null> {
  if (!HUNTER_API_KEY) {
    console.warn('HUNTER_API_KEY not set, returning null')
    return null
  }

  const domain = extractDomain(websiteUrl)
  if (!domain) {
    console.warn(`Could not extract domain from URL: ${websiteUrl}`)
    return null
  }

  try {
    const response = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${HUNTER_API_KEY}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Hunter API error for domain "${domain}":`, errorText)
      return null
    }

    const data: HunterDomainSearchResponse = await response.json()
    
    if (!data.data.emails || data.data.emails.length === 0) {
      return null
    }

    // Sort emails by:
    // 1. Our preferred prefix score (events@, bookings@, etc.)
    // 2. Generic emails over personal (we want events@ not john.doe@)
    // 3. Confidence score
    const sortedEmails = [...data.data.emails].sort((a, b) => {
      const scoreA = scoreEmail(a.value)
      const scoreB = scoreEmail(b.value)
      
      if (scoreA !== scoreB) return scoreB - scoreA
      
      // Prefer generic emails for event inquiries
      if (a.type !== b.type) {
        return a.type === 'generic' ? -1 : 1
      }
      
      return b.confidence - a.confidence
    })

    const bestEmail = sortedEmails[0]
    
    // Only return if confidence is reasonably high
    if (bestEmail.confidence < 50) {
      return null
    }

    return {
      email: bestEmail.value,
      confidence: bestEmail.confidence,
      firstName: bestEmail.first_name,
      lastName: bestEmail.last_name,
      position: bestEmail.position,
      type: bestEmail.type,
    }
  } catch (error) {
    console.error(`Error finding email for ${websiteUrl}:`, error)
    return null
  }
}

/**
 * Batch find emails for multiple websites
 * Runs requests in parallel with rate limiting
 */
export async function findEmailsBatch(
  websiteUrls: string[],
  concurrency = 5
): Promise<Map<string, HunterEmailResult | null>> {
  const results = new Map<string, HunterEmailResult | null>()
  
  // Process in batches to avoid rate limiting
  for (let i = 0; i < websiteUrls.length; i += concurrency) {
    const batch = websiteUrls.slice(i, i + concurrency)
    const batchResults = await Promise.all(
      batch.map(async (url) => ({
        url,
        result: await findEmail(url),
      }))
    )
    
    for (const { url, result } of batchResults) {
      results.set(url, result)
    }
    
    // Small delay between batches to be respectful of rate limits
    if (i + concurrency < websiteUrls.length) {
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
  }
  
  return results
}
