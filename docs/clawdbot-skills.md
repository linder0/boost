# Clawdbot Skills for VROOM Select

This document describes the Clawdbot (OpenClaw) skills needed for restaurant discovery automation.

## Overview

VROOM Select uses Clawdbot for browser automation to scrape restaurant data from sources that don't have public APIs:
- **OpenTable** - Private dining search and restaurant details
- **Beli** - Crowdsourced restaurant rankings from power users

## Prerequisites

1. Self-hosted Clawdbot instance running (or OpenClaw cloud)
2. Set environment variables:
   - `CLAWDBOT_API_URL` - Your Clawdbot API endpoint
   - `CLAWDBOT_API_KEY` - Authentication key

## Skills

### 1. OpenTable Private Dining Discovery

**Skill ID:** `vroom-opentable-private-dining`

**Purpose:** Search OpenTable for restaurants with private dining rooms in NYC.

**Trigger:** Manual (on user request)

**Input Parameters:**
```json
{
  "city": "New York",
  "neighborhood": "Tribeca",  // optional
  "partySize": 25,
  "date": "2026-03-15",       // optional
  "privateEventOnly": true
}
```

**Instructions:**
1. Navigate to `https://www.opentable.com/private-dining`
2. Set location to New York, NY
3. Enter party size from input
4. If date provided, set the date filter
5. Enable "Private Event" filter if `privateEventOnly` is true
6. Scroll through results and extract for each restaurant:
   - Restaurant name
   - Address
   - Private room capacity (min/max)
   - Minimum spend requirement
   - Contact email or phone
   - Website URL
   - OpenTable ID (from URL)
7. Return structured JSON array

**Output Format:**
```json
{
  "restaurants": [
    {
      "name": "Balthazar",
      "neighborhood": "SoHo",
      "city": "New York",
      "address": "80 Spring St, New York, NY 10012",
      "hasPrivateDining": true,
      "privateDiningCapacityMin": 20,
      "privateDiningCapacityMax": 80,
      "privateDiningMinimum": 5000,
      "contactEmail": null,
      "phone": "(212) 965-1414",
      "website": "https://balthazarny.com",
      "opentableId": "1234567",
      "discoverySource": "opentable"
    }
  ]
}
```

---

### 2. Beli Rankings Scraper

**Skill ID:** `vroom-beli-rankings`

**Purpose:** Scrape top-ranked NYC restaurants from Beli app power users.

**Trigger:** Scheduled (nightly) or Manual

**Input Parameters:**
```json
{
  "city": "New York",
  "username": null,  // optional: specific user to scrape
  "limit": 50
}
```

**Instructions:**
1. Navigate to Beli web interface or use mobile API endpoints
2. If username provided, go to that user's profile
3. Otherwise, aggregate from multiple power users
4. Find top-ranked NYC restaurants
5. Extract for each restaurant:
   - Restaurant name
   - Ranking position
   - Review count
   - Cuisine type
   - Neighborhood
6. Return structured JSON array

**Output Format:**
```json
{
  "restaurants": [
    {
      "name": "Carbone",
      "neighborhood": "Greenwich Village",
      "city": "New York",
      "cuisine": "Italian",
      "beliRank": 3,
      "reviewCount": 1234,
      "discoverySource": "beli"
    }
  ]
}
```

---

### 3. Restaurant Contact Discovery

**Skill ID:** `vroom-contact-discovery`

**Purpose:** Visit restaurant websites to find private event contact information.

**Trigger:** Manual (per restaurant)

**Input Parameters:**
```json
{
  "restaurantName": "Locanda Verde",
  "website": "https://locandaverdenyc.com",
  "address": "377 Greenwich St, New York, NY"
}
```

**Instructions:**
1. Navigate to the provided website
2. Look for pages containing: "private", "events", "group dining", "contact"
3. Find and extract:
   - Events/private dining email
   - General contact email
   - Phone number
   - Contact form URL
4. If no email found, try common patterns:
   - events@domain.com
   - privateevents@domain.com
   - info@domain.com
5. Return contact information

**Output Format:**
```json
{
  "restaurantName": "Locanda Verde",
  "contactEmail": "events@locandaverdenyc.com",
  "phone": "(212) 925-3797",
  "contactFormUrl": "https://locandaverdenyc.com/private-events",
  "emailSource": "website"  // "website", "pattern", "form"
}
```

---

## Integration

The VROOM Select app calls these skills via the Clawdbot API:

```typescript
import { scheduleDiscoveryTask, waitForTask } from '@/lib/discovery/clawdbot'

// Schedule OpenTable discovery
const task = await scheduleDiscoveryTask('opentable_private_dining', {
  city: 'New York',
  neighborhood: 'Tribeca',
  partySize: 25,
})

// Wait for results
const completed = await waitForTask(task.id)
const restaurants = completed.results
```

## Error Handling

Skills should handle common scenarios:
- Rate limiting from target sites
- Changed page structures (graceful degradation)
- Missing data fields (return null, don't fail)
- Timeout after 2 minutes per task

## Testing

Test each skill manually in Clawdbot before deploying:
1. Run skill with sample inputs
2. Verify output matches expected format
3. Check that anti-bot measures are handled
4. Validate data quality

## Maintenance

OpenTable and Beli may change their interfaces. Monitor for:
- Selector changes
- New anti-scraping measures
- API endpoint changes

Update skill instructions when sites change.
