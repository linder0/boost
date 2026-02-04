/**
 * Exa AI integration for restaurant discovery
 * Uses semantic web search to find restaurants with private dining
 *
 * Two search strategies:
 * 1. Direct restaurant website search
 * 2. Review site search (Infatuation, Eater, TimeOut, etc.)
 */

const EXA_API_KEY = process.env.EXA_API_KEY
const EXA_API_URL = 'https://api.exa.ai/search'

// Review sites to search for restaurant mentions
const REVIEW_SITE_DOMAINS = [
  'theinfatuation.com',
  'eater.com',
  'timeout.com',
  'ny.eater.com',
  'nymag.com',
]

export interface ExaSearchResult {
  id: string
  url: string
  title: string
  text?: string
  publishedDate?: string
  author?: string
}

interface ExaAPIResponse {
  requestId: string
  results: Array<{
    id: string
    url: string
    title: string
    text?: string
    publishedDate?: string
    author?: string
  }>
}

export interface ExaVenue {
  name: string
  url: string
  description?: string
  sourceType: 'restaurant_website' | 'review_site'
}

/**
 * Search for restaurants using Exa semantic search
 */
export async function searchExaVenues(
  city: string,
  cuisine?: string,
  limit: number = 20
): Promise<ExaVenue[]> {
  if (!EXA_API_KEY) {
    console.warn('[Exa] No EXA_API_KEY configured - skipping Exa search')
    return []
  }

  const allVenues: ExaVenue[] = []
  const seenUrls = new Set<string>()
  const seenDomains = new Set<string>()
  const seenNames = new Set<string>()

  // Strategy 1: Direct restaurant website search
  const directQuery = buildDirectQuery(city, cuisine)
  console.log(`[Exa] Searching direct: "${directQuery}"`)

  try {
    const directResults = await searchExa(directQuery, Math.ceil(limit / 2))
    for (const result of directResults) {
      if (seenUrls.has(result.url)) continue
      seenUrls.add(result.url)

      const venue = parseDirectResult(result)
      if (!venue) continue

      // Deduplicate by domain (e.g., multiple pages from same restaurant site)
      const domain = extractDomain(result.url)
      if (seenDomains.has(domain)) continue
      seenDomains.add(domain)

      // Deduplicate by cleaned name
      const normalizedName = venue.name.toLowerCase().replace(/[^a-z0-9]/g, '')
      if (seenNames.has(normalizedName)) continue
      seenNames.add(normalizedName)

      allVenues.push(venue)
    }
    console.log(`[Exa] Direct search found ${directResults.length} results`)
  } catch (error) {
    console.error('[Exa] Direct search error:', error instanceof Error ? error.message : error)
  }

  // Strategy 2: Review site search
  const reviewQuery = buildReviewQuery(city, cuisine)
  console.log(`[Exa] Searching reviews: "${reviewQuery}"`)

  try {
    const reviewResults = await searchExa(reviewQuery, Math.ceil(limit / 2), REVIEW_SITE_DOMAINS)
    for (const result of reviewResults) {
      if (seenUrls.has(result.url)) continue
      seenUrls.add(result.url)

      const venues = parseReviewResult(result)
      for (const venue of venues) {
        // Deduplicate by cleaned name
        const normalizedName = venue.name.toLowerCase().replace(/[^a-z0-9]/g, '')
        if (seenNames.has(normalizedName)) continue
        seenNames.add(normalizedName)

        allVenues.push(venue)
      }
    }
    console.log(`[Exa] Review search found ${reviewResults.length} results`)
  } catch (error) {
    console.error('[Exa] Review search error:', error instanceof Error ? error.message : error)
  }

  console.log(`[Exa] Total venues found: ${allVenues.length}`)
  return allVenues.slice(0, limit)
}

/**
 * Build query for direct restaurant website search
 */
function buildDirectQuery(city: string, cuisine?: string): string {
  const parts = ['private dining room', 'restaurant']
  if (cuisine) {
    parts.push(cuisine)
  }
  parts.push(city)
  return parts.join(' ')
}

/**
 * Build query for review site search
 */
function buildReviewQuery(city: string, cuisine?: string): string {
  const parts = ['best private dining', 'group dinner']
  if (cuisine) {
    parts.push(cuisine)
  }
  parts.push(city)
  return parts.join(' ')
}

/**
 * Call Exa API
 */
async function searchExa(
  query: string,
  numResults: number,
  includeDomains?: string[]
): Promise<ExaSearchResult[]> {
  const body: Record<string, unknown> = {
    query,
    numResults,
    type: 'auto',
    contents: {
      text: true,
    },
  }

  if (includeDomains && includeDomains.length > 0) {
    body.includeDomains = includeDomains
  }

  const response = await fetch(EXA_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': EXA_API_KEY!,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unable to read response')
    throw new Error(`Exa API error: HTTP ${response.status} - ${errorText.slice(0, 200)}`)
  }

  const data: ExaAPIResponse = await response.json()
  return data.results || []
}

/**
 * Parse direct restaurant website result
 */
function parseDirectResult(result: ExaSearchResult): ExaVenue | null {
  // Extract restaurant name from title
  // Common patterns: "Restaurant Name - Private Dining" or "Restaurant Name | ..."
  let name = result.title

  // Remove common prefixes
  name = name
    .replace(/^(home|about|menu|contact|faq|experience|private dining|private events|groups & events|book|reservations?)\s*[-|–—:]\s*/i, '')
    .replace(/^(official website of|welcome to)\s*/i, '')

  // Remove common suffixes after separators
  name = name
    .replace(/\s*[-|–—]\s*(private dining|private events|events|menu|home|reservations?|about|contact|nyc?|new york.*|opentable|yelp|resy).*$/i, '')
    .replace(/\s*\|\s*(private dining|private events|events|menu|home|reservations?|about|contact|nyc?|new york.*|opentable|yelp|resy|restaurant|modern.*restaurant).*$/i, '')
    .replace(/\s+in\s+new\s+york.*$/i, '')

  // Remove "Restaurant" suffix if it follows the name
  name = name.replace(/\s+(restaurant|restaurants)$/i, '')

  // Clean up whitespace
  name = name.replace(/\s+/g, ' ').trim()

  // Skip if name looks like a generic page
  if (isGenericPage(name, result.url)) {
    return null
  }

  if (!name || name.length < 2) {
    return null
  }

  return {
    name,
    url: result.url,
    description: result.text?.slice(0, 500),
    sourceType: 'restaurant_website',
  }
}

/**
 * Parse review site result - may contain multiple restaurant mentions
 * For now, we extract the article as a single venue representing the featured restaurant
 */
function parseReviewResult(result: ExaSearchResult): ExaVenue[] {
  // For review articles, extract the main restaurant if it's a single-restaurant review
  // or create a venue entry for the article itself

  // Common patterns for single-restaurant reviews:
  // "Review: Restaurant Name" or "Restaurant Name Review"
  const singleReviewMatch = result.title.match(/^(?:review[:\s]+)?([^|–—]+?)(?:\s+review)?$/i)

  if (singleReviewMatch) {
    const name = singleReviewMatch[1].trim()
    if (!isGenericPage(name, result.url) && name.length > 2) {
      return [{
        name,
        url: result.url,
        description: result.text?.slice(0, 500),
        sourceType: 'review_site',
      }]
    }
  }

  // For list articles, we'd need more sophisticated parsing
  // For now, skip list articles as they're harder to extract individual restaurants from
  return []
}

/**
 * Extract domain from URL for deduplication
 */
function extractDomain(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * Check if a page looks like a generic/non-restaurant page
 */
function isGenericPage(name: string, url: string): boolean {
  const genericPatterns = [
    /^home$/i,
    /^private dining$/i,
    /^private events$/i,
    /^group dining$/i,
    /^events$/i,
    /^contact$/i,
    /^about$/i,
    /^menu$/i,
    /^faq$/i,
    /^experience$/i,
    /^reservations?$/i,
    /^book$/i,
    /^groups?$/i,
    /^\d+ best/i,
    /^the \d+ best/i,
    /^where to/i,
    /^guide to/i,
    /^japanese dining/i,
    /^japanese restaurant/i,
    /^modern japanese/i,
  ]

  if (genericPatterns.some(p => p.test(name))) {
    return true
  }

  // Skip URLs that look like list pages
  if (url.includes('/best-') || url.includes('/top-') || url.includes('/guide')) {
    return true
  }

  return false
}

/**
 * Convert Exa venue to DiscoveredRestaurant format
 * This is called from the main discovery index
 */
export function exaVenueToDiscovered(venue: ExaVenue, city: string): {
  name: string
  city: string
  website: string
  discoverySource: 'exa'
} {
  return {
    name: venue.name,
    city,
    website: venue.url,
    discoverySource: 'exa',
  }
}
