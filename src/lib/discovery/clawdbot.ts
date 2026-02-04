/**
 * Clawdbot Integration Client
 * Browser automation agent for discovering restaurants from OpenTable, Beli, and restaurant websites
 *
 * Clawdbot (OpenClaw) is a self-hosted AI assistant that can control browsers
 * to scrape data from websites that don't have public APIs.
 *
 * See: https://clawbot.ai / https://docs.clawd.bot
 */

const CLAWDBOT_API_BASE = process.env.CLAWDBOT_API_URL || 'http://localhost:3001'
const CLAWDBOT_API_KEY = process.env.CLAWDBOT_API_KEY

// ============================================================================
// Types
// ============================================================================

export type ClawdbotTaskType =
  | 'opentable_private_dining'
  | 'beli_rankings'
  | 'contact_discovery'
  | 'restaurant_details'

export type ClawdbotTaskStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'

export interface ClawdbotTask {
  id: string
  type: ClawdbotTaskType
  status: ClawdbotTaskStatus
  createdAt: string
  completedAt?: string
  params: Record<string, unknown>
  results?: DiscoveredRestaurant[]
  error?: string
}

export interface DiscoveredRestaurant {
  name: string
  neighborhood?: string
  city: string
  cuisine?: string
  address?: string
  latitude?: number
  longitude?: number
  website?: string
  phone?: string
  contactEmail?: string
  // Private dining specific
  hasPrivateDining?: boolean
  privateDiningCapacityMin?: number
  privateDiningCapacityMax?: number
  privateDiningMinimum?: number
  // Platform IDs
  opentableId?: string
  beliRank?: number
  // Source tracking
  discoverySource: 'opentable' | 'beli' | 'website'
}

export interface OpenTableSearchParams {
  city?: string
  neighborhood?: string
  partySize?: number
  date?: string
  privateEventOnly?: boolean
}

export interface BeliSearchParams {
  username?: string // Beli user to scrape rankings from
  city?: string
  limit?: number
}

export interface ContactDiscoveryParams {
  restaurantName: string
  website?: string
  address?: string
}

// ============================================================================
// Task Management
// ============================================================================

/**
 * Schedule a new Clawdbot discovery task
 */
export async function scheduleDiscoveryTask(
  type: ClawdbotTaskType,
  params: OpenTableSearchParams | BeliSearchParams | ContactDiscoveryParams
): Promise<ClawdbotTask> {
  if (!CLAWDBOT_API_KEY) {
    console.warn('CLAWDBOT_API_KEY not set, returning mock task')
    return createMockTask(type, params as Record<string, unknown>)
  }

  try {
    const response = await fetch(`${CLAWDBOT_API_BASE}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CLAWDBOT_API_KEY}`,
      },
      body: JSON.stringify({
        type,
        params,
        skill: getSkillName(type),
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to schedule task: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Clawdbot task scheduling error:', error)
    return createMockTask(type, params as Record<string, unknown>, 'failed', String(error))
  }
}

/**
 * Get the status and results of a task
 */
export async function getTaskStatus(taskId: string): Promise<ClawdbotTask> {
  if (!CLAWDBOT_API_KEY) {
    console.warn('CLAWDBOT_API_KEY not set, returning mock completed task')
    return {
      id: taskId,
      type: 'opentable_private_dining',
      status: 'completed',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      params: {},
      results: getMockResults(),
    }
  }

  try {
    const response = await fetch(`${CLAWDBOT_API_BASE}/api/tasks/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${CLAWDBOT_API_KEY}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to get task status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Clawdbot task status error:', error)
    return {
      id: taskId,
      type: 'opentable_private_dining',
      status: 'failed',
      createdAt: new Date().toISOString(),
      params: {},
      error: String(error),
    }
  }
}

/**
 * Wait for a task to complete with polling
 */
export async function waitForTask(
  taskId: string,
  maxWaitMs: number = 120000,
  pollIntervalMs: number = 5000
): Promise<ClawdbotTask> {
  const startTime = Date.now()

  while (Date.now() - startTime < maxWaitMs) {
    const task = await getTaskStatus(taskId)

    if (task.status === 'completed' || task.status === 'failed') {
      return task
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }

  return {
    id: taskId,
    type: 'opentable_private_dining',
    status: 'failed',
    createdAt: new Date().toISOString(),
    params: {},
    error: 'Task timed out',
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Discover restaurants with private dining from OpenTable
 */
export async function discoverOpenTablePrivateDining(
  params: OpenTableSearchParams
): Promise<DiscoveredRestaurant[]> {
  const task = await scheduleDiscoveryTask('opentable_private_dining', {
    city: params.city || 'New York',
    neighborhood: params.neighborhood,
    partySize: params.partySize || 20,
    date: params.date,
    privateEventOnly: params.privateEventOnly ?? true,
  })

  const completed = await waitForTask(task.id)
  return completed.results || []
}

/**
 * Get Beli rankings for NYC restaurants
 */
export async function getBeliRankings(
  params: BeliSearchParams
): Promise<DiscoveredRestaurant[]> {
  const task = await scheduleDiscoveryTask('beli_rankings', {
    city: params.city || 'New York',
    username: params.username,
    limit: params.limit || 50,
  })

  const completed = await waitForTask(task.id)
  return completed.results || []
}

/**
 * Discover contact information for a restaurant
 */
export async function discoverContactInfo(
  params: ContactDiscoveryParams
): Promise<DiscoveredRestaurant | null> {
  const task = await scheduleDiscoveryTask('contact_discovery', params)
  const completed = await waitForTask(task.id, 60000) // 1 minute timeout

  return completed.results?.[0] || null
}

// ============================================================================
// Helper Functions
// ============================================================================

function getSkillName(type: ClawdbotTaskType): string {
  const skillMap: Record<ClawdbotTaskType, string> = {
    opentable_private_dining: 'vroom-opentable-private-dining',
    beli_rankings: 'vroom-beli-rankings',
    contact_discovery: 'vroom-contact-discovery',
    restaurant_details: 'vroom-restaurant-details',
  }
  return skillMap[type]
}

function createMockTask(
  type: ClawdbotTaskType,
  params: Record<string, unknown>,
  status: ClawdbotTaskStatus = 'pending',
  error?: string
): ClawdbotTask {
  return {
    id: `mock-${Date.now()}`,
    type,
    status,
    createdAt: new Date().toISOString(),
    params,
    error,
    results: status === 'completed' ? getMockResults() : undefined,
  }
}

function getMockResults(): DiscoveredRestaurant[] {
  // Return some mock results for development/testing
  return [
    {
      name: 'The Smith',
      neighborhood: 'Midtown',
      city: 'New York',
      cuisine: 'American',
      address: '956 2nd Ave, New York, NY 10022',
      latitude: 40.7568,
      longitude: -73.9679,
      website: 'https://thesmithrestaurant.com',
      hasPrivateDining: true,
      privateDiningCapacityMin: 15,
      privateDiningCapacityMax: 60,
      privateDiningMinimum: 2500,
      opentableId: '12345',
      discoverySource: 'opentable',
    },
    {
      name: 'Carbone',
      neighborhood: 'Greenwich Village',
      city: 'New York',
      cuisine: 'Italian',
      address: '181 Thompson St, New York, NY 10012',
      latitude: 40.7276,
      longitude: -73.9992,
      website: 'https://carbonenewyork.com',
      hasPrivateDining: true,
      privateDiningCapacityMin: 8,
      privateDiningCapacityMax: 24,
      privateDiningMinimum: 5000,
      beliRank: 3,
      discoverySource: 'beli',
    },
  ]
}

// ============================================================================
// Clawdbot Skill Definitions (for documentation/setup)
// ============================================================================

/**
 * Clawdbot skill configurations
 * These define what skills need to be installed in Clawdbot
 */
export const CLAWDBOT_SKILLS = {
  'vroom-opentable-private-dining': {
    name: 'OpenTable Private Dining Discovery',
    description: 'Searches OpenTable for restaurants with private dining rooms in NYC',
    instructions: `
      1. Navigate to OpenTable private dining search
      2. Set location to New York, NY
      3. Filter by party size and date if provided
      4. Extract restaurant details: name, address, capacity, minimum spend
      5. Return structured JSON results
    `,
    trigger: 'manual',
  },
  'vroom-beli-rankings': {
    name: 'Beli Rankings Scraper',
    description: 'Scrapes restaurant rankings from Beli app power users',
    instructions: `
      1. Navigate to Beli web or use mobile API
      2. Find top-ranked NYC restaurants
      3. Extract: name, ranking, review count, cuisine
      4. Return structured JSON results
    `,
    trigger: 'scheduled', // Can run nightly
  },
  'vroom-contact-discovery': {
    name: 'Restaurant Contact Discovery',
    description: 'Finds contact email and phone from restaurant website',
    instructions: `
      1. Navigate to restaurant website
      2. Look for contact/private events page
      3. Extract: email, phone, contact form URL
      4. Return contact information
    `,
    trigger: 'manual',
  },
} as const
