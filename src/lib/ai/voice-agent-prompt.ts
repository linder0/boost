import { Event } from '@/types/database'

export type ConversationSection = 
  | 'greeting' 
  | 'location' 
  | 'haveAlready' 
  | 'whatNeed' 
  | 'details' 
  | 'preferences' 
  | 'summary'

export interface VoiceAgentEventData {
  name?: string
  description?: string
  city?: string
  neighborhood?: string
  locationAddress?: string
  locationLat?: number
  locationLng?: number
  headcount?: number
  budget?: number
  preferredDates?: { date: string; rank: number }[]
  timeFrame?: 'morning' | 'afternoon' | 'evening' | 'night'
  needsVenue?: boolean
  venueNotes?: string
  venueTypes?: string[]
  indoorOutdoor?: 'indoor' | 'outdoor' | 'either'
  vendorCategories?: string[]
  vendorNotes?: Record<string, string>
  alreadyHaveVenue?: boolean
  alreadyHaveVenueNotes?: string
  alreadyHaveCategories?: string[]
  alreadyHaveNotes?: Record<string, string>
}

const VENDOR_CATEGORIES = [
  'catering',
  'photography', 
  'videography',
  'entertainment',
  'florals',
  'rentals',
  'transportation',
  'staffing',
]

export function buildVoiceAgentPrompt(
  section: ConversationSection,
  collectedData: VoiceAgentEventData,
  isEditMode: boolean = false
): string {
  const sectionInstructions = isEditMode 
    ? getEditModeInstructions(collectedData)
    : getSectionInstructions(section, collectedData)
  const collectedSummary = formatCollectedData(collectedData)

  const modeContext = isEditMode
    ? `You are helping update an existing event. The user already has event details saved - ask what they want to change and update accordingly. Don't go through each section; instead, be flexible and responsive to what they want to modify.`
    : `Your goal is to gather all the necessary information naturally, like a helpful friend on the phone.`

  return `You are a friendly, conversational event planning assistant helping someone ${isEditMode ? 'update their' : 'plan their'} event through a voice call. ${modeContext}

## Your Personality
- Warm and enthusiastic but not over the top
- Concise - keep responses to 1-3 sentences when possible
- Use natural speech patterns (contractions, casual language)
- Confirm what you hear before moving on
- Be helpful when they seem unsure

## Current Conversation Stage
**Section:** ${section}
${sectionInstructions}

## Information Already Collected
${collectedSummary || 'Nothing yet - this is the start of the conversation.'}

## Available Vendor Categories
When they mention needing help, these are the categories you can recognize:
- Catering (food, drinks, bar service)
- Photography
- Videography
- Entertainment / DJ (music, live band, performances)
- Florals / Decor (flowers, decorations)
- Rentals (tables, chairs, linens, equipment)
- Transportation (shuttles, limos)
- Event Staffing (servers, bartenders, coordinators)

## Function Calling
Use the provided functions to capture information as you hear it. Call functions immediately when you extract data - don't wait until the end of a section.

## Important Guidelines
1. Never ask for more than 2-3 pieces of information at once
2. Always confirm what you heard before moving to the next topic
3. If they seem unsure about something (like budget), offer a range or skip temporarily
4. Use natural transitions between topics
5. Keep track of what's been discussed to avoid repeating questions
6. If they want to go back and change something, be accommodating
7. When summarizing at the end, be thorough but concise`
}

function getSectionInstructions(
  section: ConversationSection,
  data: VoiceAgentEventData
): string {
  switch (section) {
    case 'greeting':
      return `**Goal:** Greet the user warmly and learn about their event.
      
**What to collect:**
- Event name (or what they want to call it)
- Brief description of what the event is for

**Example opening:** "Hi! I'm here to help you plan your event. What are you planning - a party, corporate event, wedding, or something else?"

**Transitions:** Once you have the name and a sense of what it's for, move to asking about location.`

    case 'location':
      return `**Goal:** Find out where they want to hold the event.

**What to collect:**
- City
- Neighborhood or area (optional but helpful)

**Example:** "Great! Where are you thinking of having this? Just the city or neighborhood is fine."

**Notes:** Don't need an exact address yet - that comes with venue selection.`

    case 'haveAlready':
      return `**Goal:** Check if they already have anything booked.

**What to collect:**
- Do they already have a venue? If so, what/where?
- Do they already have any vendors booked? Which ones?

**Example:** "Before we figure out what you need, do you already have anything booked? Like a venue or any vendors?"

**Notes:** If they have a venue, we won't need to find one. Same for any vendor categories they've covered.`

    case 'whatNeed':
      return `**Goal:** Determine what services they need help finding.

**What to collect:**
- Do they need a venue?
- Which vendor categories do they need? (catering, photography, etc.)
- Any specific notes about what they want for each

**Example:** "So what do you need help finding? Are you looking for a venue? What about catering, photography, or other vendors?"

**Notes:** 
- Don't ask about categories they already have booked
- It's okay if they don't know all the details yet`

    case 'details':
      return `**Goal:** Collect the key logistics.

**What to collect:**
- Headcount (number of guests)
- Budget (total budget for everything)
- Preferred dates (can be multiple, ranked)
- Time of day preference (morning, afternoon, evening, night)

**Example:** "Now for some details - about how many people are you expecting? And do you have a budget in mind?"

**Notes:**
- If unsure about budget, suggest they think about a comfortable range
- For dates, it's helpful to have 2-3 options
- Don't push too hard if they're unsure about exact numbers`

    case 'preferences':
      if (!data.needsVenue) {
        return `**Skip this section** - they already have a venue or don't need one.`
      }
      return `**Goal:** Collect venue preferences.

**What to collect:**
- Venue type (rooftop, restaurant, bar, cafe, wellness, lounge)
- Indoor/outdoor preference
- Any specific venue requirements

**Example:** "What kind of venue vibe are you going for? Like a rooftop, restaurant, bar...? And do you have a preference for indoor or outdoor?"

**Notes:** Keep it conversational - these are preferences, not requirements.`

    case 'summary':
      return `**Goal:** Summarize everything and confirm before creating the event.

**What to do:**
1. Read back all the key details you've collected
2. Ask if anything needs to be changed
3. Once confirmed, let them know you're creating the event

**Example:** "Okay, let me make sure I've got everything right. You're planning [name] for about [X] people in [location], with a budget of [amount]. You need help finding [services]. The dates you're looking at are [dates]. Does that all sound right?"

**Notes:** Be thorough but organized in your summary.`

    default:
      return ''
  }
}

function getEditModeInstructions(data: VoiceAgentEventData): string {
  return `**Goal:** Help the user update their existing event.

**Current Event Details:**
${formatCollectedData(data)}

**Your Approach:**
1. Start by briefly acknowledging their event ("I see you have ${data.name || 'an event'} planned...")
2. Ask what they'd like to change or update
3. Listen for what they want to modify and update accordingly
4. Use the same function tools to update any fields they mention
5. When they're done making changes, confirm and save

**Example opening:** "I see you have ${data.name || 'your event'} set up${data.city ? ` in ${data.city}` : ''}. What would you like to update?"

**Important:**
- Be flexible - they might want to change one thing or several
- Don't go through every section unless they ask
- Confirm changes as you make them
- When done, call confirm_and_create to save the updates`
}

function formatCollectedData(data: VoiceAgentEventData): string {
  const lines: string[] = []

  if (data.name) lines.push(`- Event Name: ${data.name}`)
  if (data.description) lines.push(`- Description: ${data.description}`)
  if (data.city) lines.push(`- City: ${data.city}`)
  if (data.neighborhood) lines.push(`- Neighborhood: ${data.neighborhood}`)
  if (data.headcount) lines.push(`- Guest Count: ${data.headcount}`)
  if (data.budget) lines.push(`- Budget: $${data.budget.toLocaleString()}`)
  if (data.preferredDates?.length) {
    const dateList = data.preferredDates
      .map((d, i) => `${d.date} (choice ${i + 1})`)
      .join(', ')
    lines.push(`- Preferred Dates: ${dateList}`)
  }
  if (data.timeFrame) lines.push(`- Time Frame: ${data.timeFrame}`)
  
  if (data.alreadyHaveVenue) {
    lines.push(`- Already Has Venue: Yes${data.alreadyHaveVenueNotes ? ` (${data.alreadyHaveVenueNotes})` : ''}`)
  }
  if (data.alreadyHaveCategories?.length) {
    lines.push(`- Already Has Vendors: ${data.alreadyHaveCategories.join(', ')}`)
  }
  
  if (data.needsVenue) {
    lines.push(`- Needs Venue: Yes${data.venueNotes ? ` (${data.venueNotes})` : ''}`)
    if (data.venueTypes?.length) lines.push(`  - Venue Types: ${data.venueTypes.join(', ')}`)
    if (data.indoorOutdoor) lines.push(`  - Indoor/Outdoor: ${data.indoorOutdoor}`)
  }
  if (data.vendorCategories?.length) {
    lines.push(`- Needs Vendors: ${data.vendorCategories.join(', ')}`)
  }

  return lines.join('\n')
}

/**
 * Defines the function tools available to the voice agent for extracting structured data.
 */
export const voiceAgentTools = [
  {
    type: 'function' as const,
    name: 'update_event_info',
    description: 'Update the event name and/or description',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The name of the event',
        },
        description: {
          type: 'string',
          description: 'A brief description of what the event is for',
        },
      },
    },
  },
  {
    type: 'function' as const,
    name: 'update_location',
    description: 'Update the event location',
    parameters: {
      type: 'object',
      properties: {
        city: {
          type: 'string',
          description: 'The city where the event will be held',
        },
        neighborhood: {
          type: 'string',
          description: 'The neighborhood or area within the city',
        },
      },
    },
  },
  {
    type: 'function' as const,
    name: 'update_headcount',
    description: 'Update the expected number of guests',
    parameters: {
      type: 'object',
      properties: {
        count: {
          type: 'number',
          description: 'The number of expected guests',
        },
      },
      required: ['count'],
    },
  },
  {
    type: 'function' as const,
    name: 'update_budget',
    description: 'Update the total budget for the event',
    parameters: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          description: 'The total budget amount in dollars',
        },
      },
      required: ['amount'],
    },
  },
  {
    type: 'function' as const,
    name: 'add_preferred_date',
    description: 'Add a preferred date for the event',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'The date in YYYY-MM-DD format',
        },
        rank: {
          type: 'number',
          description: 'The preference rank (1 = most preferred)',
        },
      },
      required: ['date'],
    },
  },
  {
    type: 'function' as const,
    name: 'set_time_frame',
    description: 'Set the preferred time of day for the event',
    parameters: {
      type: 'object',
      properties: {
        timeFrame: {
          type: 'string',
          enum: ['morning', 'afternoon', 'evening', 'night'],
          description: 'The time of day preference',
        },
      },
      required: ['timeFrame'],
    },
  },
  {
    type: 'function' as const,
    name: 'set_already_have_venue',
    description: 'Mark that the user already has a venue booked',
    parameters: {
      type: 'object',
      properties: {
        hasVenue: {
          type: 'boolean',
          description: 'Whether they already have a venue',
        },
        notes: {
          type: 'string',
          description: 'Details about the venue they have',
        },
      },
      required: ['hasVenue'],
    },
  },
  {
    type: 'function' as const,
    name: 'set_already_have_vendor',
    description: 'Mark that the user already has a specific vendor category booked',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: VENDOR_CATEGORIES,
          description: 'The vendor category they already have',
        },
        notes: {
          type: 'string',
          description: 'Details about the vendor they have',
        },
      },
      required: ['category'],
    },
  },
  {
    type: 'function' as const,
    name: 'set_needs_venue',
    description: 'Set whether the user needs help finding a venue',
    parameters: {
      type: 'object',
      properties: {
        needsVenue: {
          type: 'boolean',
          description: 'Whether they need a venue',
        },
        notes: {
          type: 'string',
          description: 'Notes about what kind of venue they want',
        },
      },
      required: ['needsVenue'],
    },
  },
  {
    type: 'function' as const,
    name: 'add_vendor_category',
    description: 'Add a vendor category that the user needs',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: VENDOR_CATEGORIES,
          description: 'The vendor category they need',
        },
        notes: {
          type: 'string',
          description: 'Specific notes or requirements for this category',
        },
      },
      required: ['category'],
    },
  },
  {
    type: 'function' as const,
    name: 'set_venue_preferences',
    description: 'Set venue preferences (type and indoor/outdoor)',
    parameters: {
      type: 'object',
      properties: {
        venueTypes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Types of venues they prefer (rooftop, restaurant, bar, cafe, wellness, lounge)',
        },
        indoorOutdoor: {
          type: 'string',
          enum: ['indoor', 'outdoor', 'either'],
          description: 'Indoor/outdoor preference',
        },
      },
    },
  },
  {
    type: 'function' as const,
    name: 'complete_section',
    description: 'Mark a conversation section as complete and move to the next one',
    parameters: {
      type: 'object',
      properties: {
        section: {
          type: 'string',
          enum: ['greeting', 'location', 'haveAlready', 'whatNeed', 'details', 'preferences', 'summary'],
          description: 'The section that was just completed',
        },
      },
      required: ['section'],
    },
  },
  {
    type: 'function' as const,
    name: 'confirm_and_create',
    description: 'Called when the user confirms all details are correct and wants to create the event',
    parameters: {
      type: 'object',
      properties: {
        confirmed: {
          type: 'boolean',
          description: 'Whether the user has confirmed all details',
        },
      },
      required: ['confirmed'],
    },
  },
]

/**
 * Get the next section in the conversation flow
 */
export function getNextSection(
  currentSection: ConversationSection,
  data: VoiceAgentEventData
): ConversationSection {
  const flow: ConversationSection[] = [
    'greeting',
    'location',
    'haveAlready',
    'whatNeed',
    'details',
    'preferences',
    'summary',
  ]
  
  const currentIndex = flow.indexOf(currentSection)
  if (currentIndex === -1 || currentIndex === flow.length - 1) {
    return 'summary'
  }
  
  const nextSection = flow[currentIndex + 1]
  
  // Skip preferences if they don't need a venue
  if (nextSection === 'preferences' && !data.needsVenue) {
    return 'summary'
  }
  
  return nextSection
}

/**
 * Convert voice agent data to the event creation format
 */
export function toEventCreateData(data: VoiceAgentEventData): Parameters<typeof import('@/app/actions/events').createEvent>[0] {
  return {
    name: data.name?.trim() || 'Untitled Event',
    description: data.description?.trim() || null,
    city: data.city?.trim() || '',
    preferred_dates: data.preferredDates || [],
    headcount: data.headcount || 0,
    total_budget: data.budget || 0,
    venue_budget_ceiling: data.budget || 0,
    date_flexibility_days: 0,
    budget_flexibility_percent: 0,
    constraints: {
      needs_venue: data.needsVenue,
      venue_notes: data.venueNotes,
      vendor_categories: data.vendorCategories,
      vendor_notes: data.vendorNotes,
      already_have_venue: data.alreadyHaveVenue,
      already_have_venue_notes: data.alreadyHaveVenueNotes,
      already_have_categories: data.alreadyHaveCategories,
      already_have_notes: data.alreadyHaveNotes,
      neighborhood: data.neighborhood,
      time_frame: data.timeFrame,
      venue_types: data.venueTypes,
      indoor_outdoor: data.indoorOutdoor,
    },
    location_address: data.locationAddress || null,
    location_lat: data.locationLat || null,
    location_lng: data.locationLng || null,
  }
}
