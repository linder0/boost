// Demo venues dataset for automated venue discovery
// Used to showcase the automation pipeline without external API dependencies

export interface DemoVenue {
  name: string
  category: string
  email: string
  city: string
  neighborhood?: string
  venueTypes: string[] // rooftop, restaurant, bar, cafe, wellness, lounge
  capacityMin: number
  capacityMax: number
  pricePerPersonMin: number
  pricePerPersonMax: number
  indoorOutdoor: 'indoor' | 'outdoor' | 'both'
  catering: {
    food: boolean
    drinks: boolean
    externalAllowed: boolean
  }
  latitude?: number
  longitude?: number
}

// Pre-seeded demo venues for key cities
export const DEMO_VENUES: DemoVenue[] = [
  // New York City
  {
    name: 'The Skylark',
    category: 'Venue',
    email: 'events@theskylark.com',
    city: 'New York',
    neighborhood: 'Midtown',
    venueTypes: ['rooftop', 'bar', 'lounge'],
    capacityMin: 30,
    capacityMax: 200,
    pricePerPersonMin: 75,
    pricePerPersonMax: 150,
    indoorOutdoor: 'both',
    catering: { food: true, drinks: true, externalAllowed: false },
    latitude: 40.7549,
    longitude: -73.9840,
  },
  {
    name: 'Public Hotel Rooftop',
    category: 'Venue',
    email: 'private.events@publichotels.com',
    city: 'New York',
    neighborhood: 'Lower East Side',
    venueTypes: ['rooftop', 'lounge'],
    capacityMin: 50,
    capacityMax: 300,
    pricePerPersonMin: 100,
    pricePerPersonMax: 200,
    indoorOutdoor: 'outdoor',
    catering: { food: true, drinks: true, externalAllowed: false },
    latitude: 40.7223,
    longitude: -73.9903,
  },
  {
    name: 'Lilia',
    category: 'Venue',
    email: 'events@lilianewyork.com',
    city: 'New York',
    neighborhood: 'Williamsburg',
    venueTypes: ['restaurant'],
    capacityMin: 20,
    capacityMax: 80,
    pricePerPersonMin: 85,
    pricePerPersonMax: 175,
    indoorOutdoor: 'indoor',
    catering: { food: true, drinks: true, externalAllowed: false },
    latitude: 40.7178,
    longitude: -73.9509,
  },
  {
    name: 'The Osprey',
    category: 'Venue',
    email: 'osprey.events@1hotels.com',
    city: 'New York',
    neighborhood: 'Brooklyn',
    venueTypes: ['restaurant', 'bar'],
    capacityMin: 40,
    capacityMax: 150,
    pricePerPersonMin: 70,
    pricePerPersonMax: 140,
    indoorOutdoor: 'both',
    catering: { food: true, drinks: true, externalAllowed: false },
    latitude: 40.6966,
    longitude: -73.9903,
  },
  {
    name: 'The Standard Biergarten',
    category: 'Venue',
    email: 'events@standardhotels.com',
    city: 'New York',
    neighborhood: 'Meatpacking',
    venueTypes: ['bar', 'lounge'],
    capacityMin: 50,
    capacityMax: 250,
    pricePerPersonMin: 50,
    pricePerPersonMax: 100,
    indoorOutdoor: 'outdoor',
    catering: { food: true, drinks: true, externalAllowed: true },
    latitude: 40.7399,
    longitude: -74.0079,
  },
  {
    name: 'Chefs Club',
    category: 'Venue',
    email: 'events@chefsclub.com',
    city: 'New York',
    neighborhood: 'SoHo',
    venueTypes: ['restaurant'],
    capacityMin: 25,
    capacityMax: 100,
    pricePerPersonMin: 125,
    pricePerPersonMax: 250,
    indoorOutdoor: 'indoor',
    catering: { food: true, drinks: true, externalAllowed: false },
    latitude: 40.7260,
    longitude: -73.9985,
  },
  {
    name: 'Bathhouse Studios',
    category: 'Venue',
    email: 'bookings@bathhousestudios.com',
    city: 'New York',
    neighborhood: 'Williamsburg',
    venueTypes: ['wellness', 'lounge'],
    capacityMin: 20,
    capacityMax: 75,
    pricePerPersonMin: 100,
    pricePerPersonMax: 180,
    indoorOutdoor: 'indoor',
    catering: { food: false, drinks: true, externalAllowed: true },
    latitude: 40.7128,
    longitude: -73.9566,
  },
  {
    name: 'House of Yes',
    category: 'Venue',
    email: 'private@houseofyes.org',
    city: 'New York',
    neighborhood: 'Bushwick',
    venueTypes: ['bar', 'lounge'],
    capacityMin: 100,
    capacityMax: 500,
    pricePerPersonMin: 40,
    pricePerPersonMax: 90,
    indoorOutdoor: 'indoor',
    catering: { food: false, drinks: true, externalAllowed: true },
    latitude: 40.7058,
    longitude: -73.9231,
  },

  // San Francisco
  {
    name: 'The Interval at Long Now',
    category: 'Venue',
    email: 'events@longnow.org',
    city: 'San Francisco',
    neighborhood: 'Fort Mason',
    venueTypes: ['bar', 'lounge', 'cafe'],
    capacityMin: 30,
    capacityMax: 120,
    pricePerPersonMin: 60,
    pricePerPersonMax: 130,
    indoorOutdoor: 'indoor',
    catering: { food: true, drinks: true, externalAllowed: false },
    latitude: 37.8067,
    longitude: -122.4316,
  },
  {
    name: 'Foreign Cinema',
    category: 'Venue',
    email: 'events@foreigncinema.com',
    city: 'San Francisco',
    neighborhood: 'Mission',
    venueTypes: ['restaurant'],
    capacityMin: 40,
    capacityMax: 200,
    pricePerPersonMin: 80,
    pricePerPersonMax: 160,
    indoorOutdoor: 'both',
    catering: { food: true, drinks: true, externalAllowed: false },
    latitude: 37.7569,
    longitude: -122.4194,
  },
  {
    name: 'The Cavalier',
    category: 'Venue',
    email: 'privateevents@thecavaliersf.com',
    city: 'San Francisco',
    neighborhood: 'SoMa',
    venueTypes: ['restaurant', 'bar'],
    capacityMin: 25,
    capacityMax: 90,
    pricePerPersonMin: 90,
    pricePerPersonMax: 175,
    indoorOutdoor: 'indoor',
    catering: { food: true, drinks: true, externalAllowed: false },
    latitude: 37.7855,
    longitude: -122.4044,
  },
  {
    name: 'El Techo',
    category: 'Venue',
    email: 'events@eltechosf.com',
    city: 'San Francisco',
    neighborhood: 'Mission',
    venueTypes: ['rooftop', 'bar'],
    capacityMin: 50,
    capacityMax: 200,
    pricePerPersonMin: 55,
    pricePerPersonMax: 110,
    indoorOutdoor: 'outdoor',
    catering: { food: true, drinks: true, externalAllowed: false },
    latitude: 37.7583,
    longitude: -122.4189,
  },
  {
    name: 'Sens Restaurant',
    category: 'Venue',
    email: 'events@sens-sf.com',
    city: 'San Francisco',
    neighborhood: 'Embarcadero',
    venueTypes: ['restaurant', 'lounge'],
    capacityMin: 30,
    capacityMax: 150,
    pricePerPersonMin: 95,
    pricePerPersonMax: 180,
    indoorOutdoor: 'indoor',
    catering: { food: true, drinks: true, externalAllowed: false },
    latitude: 37.7955,
    longitude: -122.3937,
  },
  {
    name: 'Archimedes Banya',
    category: 'Venue',
    email: 'private@bfremo.com',
    city: 'San Francisco',
    neighborhood: 'SOMA',
    venueTypes: ['wellness'],
    capacityMin: 20,
    capacityMax: 60,
    pricePerPersonMin: 85,
    pricePerPersonMax: 150,
    indoorOutdoor: 'indoor',
    catering: { food: true, drinks: true, externalAllowed: false },
    latitude: 37.7749,
    longitude: -122.4019,
  },

  // Los Angeles
  {
    name: 'E.P. & L.P.',
    category: 'Venue',
    email: 'events@eplosangeles.com',
    city: 'Los Angeles',
    neighborhood: 'West Hollywood',
    venueTypes: ['rooftop', 'restaurant', 'bar'],
    capacityMin: 50,
    capacityMax: 300,
    pricePerPersonMin: 75,
    pricePerPersonMax: 150,
    indoorOutdoor: 'both',
    catering: { food: true, drinks: true, externalAllowed: false },
    latitude: 34.0900,
    longitude: -118.3868,
  },
  {
    name: 'The Highlight Room',
    category: 'Venue',
    email: 'events@dreamhollywood.com',
    city: 'Los Angeles',
    neighborhood: 'Hollywood',
    venueTypes: ['rooftop', 'lounge'],
    capacityMin: 75,
    capacityMax: 350,
    pricePerPersonMin: 100,
    pricePerPersonMax: 200,
    indoorOutdoor: 'outdoor',
    catering: { food: true, drinks: true, externalAllowed: false },
    latitude: 34.1016,
    longitude: -118.3267,
  },
  {
    name: 'Elephante',
    category: 'Venue',
    email: 'private@elephantela.com',
    city: 'Los Angeles',
    neighborhood: 'Santa Monica',
    venueTypes: ['restaurant', 'lounge'],
    capacityMin: 40,
    capacityMax: 175,
    pricePerPersonMin: 90,
    pricePerPersonMax: 180,
    indoorOutdoor: 'both',
    catering: { food: true, drinks: true, externalAllowed: false },
    latitude: 34.0195,
    longitude: -118.4912,
  },
  {
    name: 'Catch LA',
    category: 'Venue',
    email: 'events@catchla.com',
    city: 'Los Angeles',
    neighborhood: 'West Hollywood',
    venueTypes: ['rooftop', 'restaurant'],
    capacityMin: 50,
    capacityMax: 250,
    pricePerPersonMin: 120,
    pricePerPersonMax: 220,
    indoorOutdoor: 'outdoor',
    catering: { food: true, drinks: true, externalAllowed: false },
    latitude: 34.0853,
    longitude: -118.3765,
  },
  {
    name: 'Good Times at Davey Wayne',
    category: 'Venue',
    email: 'events@daveywaynes.com',
    city: 'Los Angeles',
    neighborhood: 'Hollywood',
    venueTypes: ['bar', 'lounge'],
    capacityMin: 60,
    capacityMax: 250,
    pricePerPersonMin: 45,
    pricePerPersonMax: 85,
    indoorOutdoor: 'both',
    catering: { food: true, drinks: true, externalAllowed: true },
    latitude: 34.1014,
    longitude: -118.3379,
  },
  {
    name: 'The Rose Venice',
    category: 'Venue',
    email: 'private@therosevenice.com',
    city: 'Los Angeles',
    neighborhood: 'Venice',
    venueTypes: ['restaurant', 'cafe'],
    capacityMin: 30,
    capacityMax: 120,
    pricePerPersonMin: 65,
    pricePerPersonMax: 125,
    indoorOutdoor: 'indoor',
    catering: { food: true, drinks: true, externalAllowed: false },
    latitude: 33.9925,
    longitude: -118.4695,
  },

  // Chicago
  {
    name: 'Cindy\'s Rooftop',
    category: 'Venue',
    email: 'events@cindysrooftop.com',
    city: 'Chicago',
    neighborhood: 'Loop',
    venueTypes: ['rooftop', 'restaurant', 'bar'],
    capacityMin: 40,
    capacityMax: 200,
    pricePerPersonMin: 85,
    pricePerPersonMax: 165,
    indoorOutdoor: 'both',
    catering: { food: true, drinks: true, externalAllowed: false },
    latitude: 41.8826,
    longitude: -87.6246,
  },
  {
    name: 'The Robey',
    category: 'Venue',
    email: 'events@therobey.com',
    city: 'Chicago',
    neighborhood: 'Wicker Park',
    venueTypes: ['rooftop', 'lounge'],
    capacityMin: 30,
    capacityMax: 150,
    pricePerPersonMin: 70,
    pricePerPersonMax: 140,
    indoorOutdoor: 'both',
    catering: { food: true, drinks: true, externalAllowed: false },
    latitude: 41.9087,
    longitude: -87.6773,
  },
  {
    name: 'Girl & The Goat',
    category: 'Venue',
    email: 'private@girlandthegoat.com',
    city: 'Chicago',
    neighborhood: 'West Loop',
    venueTypes: ['restaurant'],
    capacityMin: 20,
    capacityMax: 75,
    pricePerPersonMin: 100,
    pricePerPersonMax: 190,
    indoorOutdoor: 'indoor',
    catering: { food: true, drinks: true, externalAllowed: false },
    latitude: 41.8837,
    longitude: -87.6477,
  },
  {
    name: 'Maple & Ash',
    category: 'Venue',
    email: 'events@mapleandash.com',
    city: 'Chicago',
    neighborhood: 'Gold Coast',
    venueTypes: ['restaurant', 'bar'],
    capacityMin: 25,
    capacityMax: 120,
    pricePerPersonMin: 110,
    pricePerPersonMax: 200,
    indoorOutdoor: 'indoor',
    catering: { food: true, drinks: true, externalAllowed: false },
    latitude: 41.9010,
    longitude: -87.6264,
  },
  {
    name: 'The Aviary',
    category: 'Venue',
    email: 'reservations@theaviary.com',
    city: 'Chicago',
    neighborhood: 'West Loop',
    venueTypes: ['bar', 'lounge'],
    capacityMin: 20,
    capacityMax: 60,
    pricePerPersonMin: 125,
    pricePerPersonMax: 225,
    indoorOutdoor: 'indoor',
    catering: { food: true, drinks: true, externalAllowed: false },
    latitude: 41.8849,
    longitude: -87.6477,
  },
  {
    name: 'AIRE Ancient Baths',
    category: 'Venue',
    email: 'chicago@beaire.com',
    city: 'Chicago',
    neighborhood: 'River North',
    venueTypes: ['wellness'],
    capacityMin: 15,
    capacityMax: 50,
    pricePerPersonMin: 100,
    pricePerPersonMax: 175,
    indoorOutdoor: 'indoor',
    catering: { food: false, drinks: true, externalAllowed: true },
    latitude: 41.8922,
    longitude: -87.6298,
  },
]

// City name normalization for matching
function normalizeCity(city: string): string {
  const normalized = city.toLowerCase().trim()
  const cityAliases: Record<string, string> = {
    'nyc': 'new york',
    'new york city': 'new york',
    'manhattan': 'new york',
    'brooklyn': 'new york',
    'sf': 'san francisco',
    'la': 'los angeles',
    'chi': 'chicago',
  }
  return cityAliases[normalized] || normalized
}

export interface VenueFilter {
  city: string
  headcount: number
  budget?: number
  venueTypes?: string[]
  indoorOutdoor?: 'indoor' | 'outdoor' | 'either'
  neighborhood?: string
  requiresFood?: boolean
  requiresDrinks?: boolean
  externalVendorsRequired?: boolean
}

export function findMatchingVenues(filter: VenueFilter): DemoVenue[] {
  const normalizedCity = normalizeCity(filter.city)

  return DEMO_VENUES.filter((venue) => {
    // Must match city
    if (normalizeCity(venue.city) !== normalizedCity) {
      return false
    }

    // Must accommodate headcount
    if (venue.capacityMax < filter.headcount) {
      return false
    }

    // Check budget if provided (based on per-person cost)
    if (filter.budget && filter.headcount > 0) {
      const perPersonBudget = filter.budget / filter.headcount
      // Allow some flexibility - venue's min price should be within budget
      if (venue.pricePerPersonMin > perPersonBudget * 1.2) {
        return false
      }
    }

    // Match venue types if specified
    if (filter.venueTypes && filter.venueTypes.length > 0) {
      const hasMatchingType = filter.venueTypes.some((type) =>
        venue.venueTypes.includes(type.toLowerCase())
      )
      if (!hasMatchingType) {
        return false
      }
    }

    // Match indoor/outdoor preference
    if (filter.indoorOutdoor && filter.indoorOutdoor !== 'either') {
      if (venue.indoorOutdoor !== 'both' && venue.indoorOutdoor !== filter.indoorOutdoor) {
        return false
      }
    }

    // Match neighborhood if specified
    if (filter.neighborhood) {
      const normalizedNeighborhood = filter.neighborhood.toLowerCase().trim()
      if (
        venue.neighborhood &&
        !venue.neighborhood.toLowerCase().includes(normalizedNeighborhood)
      ) {
        // Soft match - don't exclude, just lower priority (handled by sorting later)
      }
    }

    // Check catering requirements
    if (filter.requiresFood && !venue.catering.food) {
      return false
    }
    if (filter.requiresDrinks && !venue.catering.drinks) {
      return false
    }
    if (filter.externalVendorsRequired && !venue.catering.externalAllowed) {
      return false
    }

    return true
  }).sort((a, b) => {
    // Sort by best fit:
    // 1. Neighborhood match
    // 2. Capacity fit (closer to headcount is better)
    // 3. Price match

    let scoreA = 0
    let scoreB = 0

    // Neighborhood bonus
    if (filter.neighborhood) {
      const normalizedNeighborhood = filter.neighborhood.toLowerCase().trim()
      if (a.neighborhood?.toLowerCase().includes(normalizedNeighborhood)) scoreA += 10
      if (b.neighborhood?.toLowerCase().includes(normalizedNeighborhood)) scoreB += 10
    }

    // Capacity fit (prefer venues where headcount is closer to max capacity)
    const capacityFitA = 1 - (a.capacityMax - filter.headcount) / a.capacityMax
    const capacityFitB = 1 - (b.capacityMax - filter.headcount) / b.capacityMax
    scoreA += capacityFitA * 5
    scoreB += capacityFitB * 5

    // Price fit (prefer venues in budget)
    if (filter.budget && filter.headcount > 0) {
      const perPersonBudget = filter.budget / filter.headcount
      const priceMatchA = perPersonBudget >= a.pricePerPersonMin ? 5 : 0
      const priceMatchB = perPersonBudget >= b.pricePerPersonMin ? 5 : 0
      scoreA += priceMatchA
      scoreB += priceMatchB
    }

    return scoreB - scoreA
  })
}

// Type for discovered venue (from Google Places + Hunter)
interface DiscoveredVenueFields {
  discoverySource?: string
  website?: string
  rating?: number
  emailConfidence?: number
  googlePlaceId?: string
  phone?: string
}

// Convert demo venue or discovered venue to vendor format for DB insertion
export function demoVenueToVendor(venue: DemoVenue & Partial<DiscoveredVenueFields>): {
  name: string
  category: string
  contact_email: string
  address?: string
  latitude?: number
  longitude?: number
  website?: string
  rating?: number
  email_confidence?: number
  google_place_id?: string
  phone?: string
  discovery_source?: string
} {
  const base = {
    name: venue.name,
    category: venue.category,
    contact_email: venue.email,
    address: venue.neighborhood ? `${venue.neighborhood}, ${venue.city}` : venue.city,
    latitude: venue.latitude,
    longitude: venue.longitude,
  }

  // Add discovery metadata if available (from DiscoveredVenue)
  if ('discoverySource' in venue && venue.discoverySource) {
    return {
      ...base,
      website: venue.website,
      rating: venue.rating,
      email_confidence: venue.emailConfidence,
      google_place_id: venue.googlePlaceId,
      phone: venue.phone,
      discovery_source: venue.discoverySource,
    }
  }

  // Default to demo source for demo venues
  return {
    ...base,
    discovery_source: 'demo',
  }
}
