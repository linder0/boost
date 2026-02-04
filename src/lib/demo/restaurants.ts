/**
 * Demo restaurants dataset for VROOM Select
 * NYC-focused private dining restaurants
 */

import type { DiscoveredEntityInput } from '@/app/actions/entities'
import type { DiscoveredRestaurant } from '@/lib/discovery'

export interface DemoRestaurant {
  name: string
  category: 'Restaurant'
  email: string
  city: string
  neighborhood: string
  cuisine: string
  priceLevel: 1 | 2 | 3 | 4 // $-$$$$
  capacityMin: number
  capacityMax: number
  pricePerPersonMin: number
  pricePerPersonMax: number
  hasPrivateDining: boolean
  privateDiningCapacityMin?: number
  privateDiningCapacityMax?: number
  privateDiningMinimum?: number
  latitude: number
  longitude: number
  website?: string
  phone?: string
}

// NYC restaurants with private dining options
export const DEMO_RESTAURANTS: DemoRestaurant[] = [
  // Tribeca
  {
    name: 'Locanda Verde',
    category: 'Restaurant',
    email: 'events@locandaverdenyc.com',
    city: 'New York',
    neighborhood: 'Tribeca',
    cuisine: 'Italian',
    priceLevel: 3,
    capacityMin: 20,
    capacityMax: 80,
    pricePerPersonMin: 95,
    pricePerPersonMax: 175,
    hasPrivateDining: true,
    privateDiningCapacityMin: 12,
    privateDiningCapacityMax: 45,
    privateDiningMinimum: 3500,
    latitude: 40.7196,
    longitude: -74.0099,
    website: 'https://locandaverdenyc.com',
  },
  {
    name: 'The Odeon',
    category: 'Restaurant',
    email: 'events@theodeonrestaurant.com',
    city: 'New York',
    neighborhood: 'Tribeca',
    cuisine: 'American',
    priceLevel: 3,
    capacityMin: 15,
    capacityMax: 100,
    pricePerPersonMin: 75,
    pricePerPersonMax: 150,
    hasPrivateDining: true,
    privateDiningCapacityMin: 20,
    privateDiningCapacityMax: 60,
    privateDiningMinimum: 2500,
    latitude: 40.7183,
    longitude: -74.0058,
    website: 'https://theodeonrestaurant.com',
  },

  // West Village
  {
    name: 'L\'Artusi',
    category: 'Restaurant',
    email: 'events@lartusi.com',
    city: 'New York',
    neighborhood: 'West Village',
    cuisine: 'Italian',
    priceLevel: 3,
    capacityMin: 10,
    capacityMax: 60,
    pricePerPersonMin: 85,
    pricePerPersonMax: 165,
    hasPrivateDining: true,
    privateDiningCapacityMin: 8,
    privateDiningCapacityMax: 24,
    privateDiningMinimum: 2000,
    latitude: 40.7336,
    longitude: -74.0021,
    website: 'https://lartusi.com',
  },
  {
    name: 'Via Carota',
    category: 'Restaurant',
    email: 'info@viacarota.com',
    city: 'New York',
    neighborhood: 'West Village',
    cuisine: 'Italian',
    priceLevel: 3,
    capacityMin: 8,
    capacityMax: 40,
    pricePerPersonMin: 80,
    pricePerPersonMax: 160,
    hasPrivateDining: false,
    latitude: 40.7332,
    longitude: -74.0028,
    website: 'https://viacarota.com',
  },
  {
    name: 'The Spotted Pig',
    category: 'Restaurant',
    email: 'events@thespottedpig.com',
    city: 'New York',
    neighborhood: 'West Village',
    cuisine: 'American',
    priceLevel: 3,
    capacityMin: 15,
    capacityMax: 65,
    pricePerPersonMin: 70,
    pricePerPersonMax: 140,
    hasPrivateDining: true,
    privateDiningCapacityMin: 12,
    privateDiningCapacityMax: 30,
    privateDiningMinimum: 1800,
    latitude: 40.7354,
    longitude: -74.0056,
  },

  // SoHo
  {
    name: 'Balthazar',
    category: 'Restaurant',
    email: 'events@balthazarny.com',
    city: 'New York',
    neighborhood: 'SoHo',
    cuisine: 'French',
    priceLevel: 3,
    capacityMin: 20,
    capacityMax: 150,
    pricePerPersonMin: 85,
    pricePerPersonMax: 175,
    hasPrivateDining: true,
    privateDiningCapacityMin: 20,
    privateDiningCapacityMax: 80,
    privateDiningMinimum: 5000,
    latitude: 40.7227,
    longitude: -73.9981,
    website: 'https://balthazarny.com',
  },
  {
    name: 'Blue Ribbon Brasserie',
    category: 'Restaurant',
    email: 'events@blueribbonrestaurants.com',
    city: 'New York',
    neighborhood: 'SoHo',
    cuisine: 'American',
    priceLevel: 3,
    capacityMin: 10,
    capacityMax: 80,
    pricePerPersonMin: 75,
    pricePerPersonMax: 160,
    hasPrivateDining: true,
    privateDiningCapacityMin: 8,
    privateDiningCapacityMax: 35,
    privateDiningMinimum: 2000,
    latitude: 40.7238,
    longitude: -73.9998,
    website: 'https://blueribbonrestaurants.com',
  },

  // Flatiron / Gramercy
  {
    name: 'Gramercy Tavern',
    category: 'Restaurant',
    email: 'events@gramercytavern.com',
    city: 'New York',
    neighborhood: 'Flatiron',
    cuisine: 'American',
    priceLevel: 4,
    capacityMin: 20,
    capacityMax: 120,
    pricePerPersonMin: 125,
    pricePerPersonMax: 250,
    hasPrivateDining: true,
    privateDiningCapacityMin: 12,
    privateDiningCapacityMax: 65,
    privateDiningMinimum: 5000,
    latitude: 40.7385,
    longitude: -73.9885,
    website: 'https://gramercytavern.com',
  },
  {
    name: 'Eleven Madison Park',
    category: 'Restaurant',
    email: 'reservations@elevenmadisonpark.com',
    city: 'New York',
    neighborhood: 'Flatiron',
    cuisine: 'Contemporary',
    priceLevel: 4,
    capacityMin: 8,
    capacityMax: 80,
    pricePerPersonMin: 335,
    pricePerPersonMax: 500,
    hasPrivateDining: true,
    privateDiningCapacityMin: 8,
    privateDiningCapacityMax: 30,
    privateDiningMinimum: 15000,
    latitude: 40.7416,
    longitude: -73.9871,
    website: 'https://elevenmadisonpark.com',
  },
  {
    name: 'ABC Kitchen',
    category: 'Restaurant',
    email: 'events@abckitchennyc.com',
    city: 'New York',
    neighborhood: 'Flatiron',
    cuisine: 'Farm-to-Table',
    priceLevel: 3,
    capacityMin: 15,
    capacityMax: 90,
    pricePerPersonMin: 75,
    pricePerPersonMax: 150,
    hasPrivateDining: true,
    privateDiningCapacityMin: 10,
    privateDiningCapacityMax: 45,
    privateDiningMinimum: 3000,
    latitude: 40.7380,
    longitude: -73.9907,
    website: 'https://abckitchennyc.com',
  },

  // Midtown
  {
    name: 'Le Bernardin',
    category: 'Restaurant',
    email: 'events@le-bernardin.com',
    city: 'New York',
    neighborhood: 'Midtown',
    cuisine: 'Seafood',
    priceLevel: 4,
    capacityMin: 10,
    capacityMax: 100,
    pricePerPersonMin: 185,
    pricePerPersonMax: 400,
    hasPrivateDining: true,
    privateDiningCapacityMin: 10,
    privateDiningCapacityMax: 60,
    privateDiningMinimum: 8000,
    latitude: 40.7614,
    longitude: -73.9818,
    website: 'https://le-bernardin.com',
  },
  {
    name: 'The Modern',
    category: 'Restaurant',
    email: 'themodernprivatedining@ushgnyc.com',
    city: 'New York',
    neighborhood: 'Midtown',
    cuisine: 'Contemporary',
    priceLevel: 4,
    capacityMin: 15,
    capacityMax: 120,
    pricePerPersonMin: 150,
    pricePerPersonMax: 300,
    hasPrivateDining: true,
    privateDiningCapacityMin: 12,
    privateDiningCapacityMax: 80,
    privateDiningMinimum: 6000,
    latitude: 40.7614,
    longitude: -73.9776,
    website: 'https://themodernnyc.com',
  },
  {
    name: 'Quality Meats',
    category: 'Restaurant',
    email: 'events@qualitymeatsnyc.com',
    city: 'New York',
    neighborhood: 'Midtown',
    cuisine: 'Steakhouse',
    priceLevel: 4,
    capacityMin: 10,
    capacityMax: 80,
    pricePerPersonMin: 125,
    pricePerPersonMax: 250,
    hasPrivateDining: true,
    privateDiningCapacityMin: 10,
    privateDiningCapacityMax: 50,
    privateDiningMinimum: 4000,
    latitude: 40.7637,
    longitude: -73.9795,
    website: 'https://qualitymeatsnyc.com',
  },

  // Upper East Side
  {
    name: 'Daniel',
    category: 'Restaurant',
    email: 'events@danielnyc.com',
    city: 'New York',
    neighborhood: 'Upper East Side',
    cuisine: 'French',
    priceLevel: 4,
    capacityMin: 8,
    capacityMax: 100,
    pricePerPersonMin: 200,
    pricePerPersonMax: 450,
    hasPrivateDining: true,
    privateDiningCapacityMin: 8,
    privateDiningCapacityMax: 65,
    privateDiningMinimum: 10000,
    latitude: 40.7663,
    longitude: -73.9660,
    website: 'https://danielnyc.com',
  },
  {
    name: 'Café Boulud',
    category: 'Restaurant',
    email: 'events@cafeboulud.com',
    city: 'New York',
    neighborhood: 'Upper East Side',
    cuisine: 'French',
    priceLevel: 4,
    capacityMin: 10,
    capacityMax: 70,
    pricePerPersonMin: 120,
    pricePerPersonMax: 250,
    hasPrivateDining: true,
    privateDiningCapacityMin: 10,
    privateDiningCapacityMax: 40,
    privateDiningMinimum: 4500,
    latitude: 40.7732,
    longitude: -73.9638,
    website: 'https://cafeboulud.com',
  },

  // Lower East Side
  {
    name: 'Katz\'s Delicatessen',
    category: 'Restaurant',
    email: 'events@katzsdelicatessen.com',
    city: 'New York',
    neighborhood: 'Lower East Side',
    cuisine: 'American',
    priceLevel: 2,
    capacityMin: 20,
    capacityMax: 200,
    pricePerPersonMin: 35,
    pricePerPersonMax: 75,
    hasPrivateDining: true,
    privateDiningCapacityMin: 25,
    privateDiningCapacityMax: 100,
    privateDiningMinimum: 1500,
    latitude: 40.7223,
    longitude: -73.9874,
    website: 'https://katzsdelicatessen.com',
  },
  {
    name: 'Dirty French',
    category: 'Restaurant',
    email: 'events@dirtyfrench.com',
    city: 'New York',
    neighborhood: 'Lower East Side',
    cuisine: 'French',
    priceLevel: 3,
    capacityMin: 15,
    capacityMax: 80,
    pricePerPersonMin: 85,
    pricePerPersonMax: 175,
    hasPrivateDining: true,
    privateDiningCapacityMin: 12,
    privateDiningCapacityMax: 40,
    privateDiningMinimum: 3000,
    latitude: 40.7219,
    longitude: -73.9888,
    website: 'https://dirtyfrench.com',
  },

  // Williamsburg
  {
    name: 'Lilia',
    category: 'Restaurant',
    email: 'events@lilianewyork.com',
    city: 'New York',
    neighborhood: 'Williamsburg',
    cuisine: 'Italian',
    priceLevel: 3,
    capacityMin: 15,
    capacityMax: 80,
    pricePerPersonMin: 85,
    pricePerPersonMax: 175,
    hasPrivateDining: true,
    privateDiningCapacityMin: 10,
    privateDiningCapacityMax: 30,
    privateDiningMinimum: 2500,
    latitude: 40.7178,
    longitude: -73.9509,
    website: 'https://lilianewyork.com',
  },
  {
    name: 'Peter Luger',
    category: 'Restaurant',
    email: 'events@peterluger.com',
    city: 'New York',
    neighborhood: 'Williamsburg',
    cuisine: 'Steakhouse',
    priceLevel: 4,
    capacityMin: 15,
    capacityMax: 100,
    pricePerPersonMin: 125,
    pricePerPersonMax: 250,
    hasPrivateDining: true,
    privateDiningCapacityMin: 12,
    privateDiningCapacityMax: 45,
    privateDiningMinimum: 4000,
    latitude: 40.7099,
    longitude: -73.9625,
    website: 'https://peterluger.com',
  },

  // Chelsea
  {
    name: 'Buddakan',
    category: 'Restaurant',
    email: 'events@buddakannyc.com',
    city: 'New York',
    neighborhood: 'Chelsea',
    cuisine: 'Chinese',
    priceLevel: 3,
    capacityMin: 20,
    capacityMax: 300,
    pricePerPersonMin: 75,
    pricePerPersonMax: 150,
    hasPrivateDining: true,
    privateDiningCapacityMin: 20,
    privateDiningCapacityMax: 150,
    privateDiningMinimum: 5000,
    latitude: 40.7426,
    longitude: -74.0057,
    website: 'https://buddakannyc.com',
  },
  {
    name: 'Morimoto',
    category: 'Restaurant',
    email: 'events@morimotonyc.com',
    city: 'New York',
    neighborhood: 'Chelsea',
    cuisine: 'Japanese',
    priceLevel: 4,
    capacityMin: 15,
    capacityMax: 200,
    pricePerPersonMin: 100,
    pricePerPersonMax: 225,
    hasPrivateDining: true,
    privateDiningCapacityMin: 10,
    privateDiningCapacityMax: 80,
    privateDiningMinimum: 5000,
    latitude: 40.7426,
    longitude: -74.0055,
    website: 'https://morimotonyc.com',
  },
]

// ============================================================================
// Filtering & Search Functions
// ============================================================================

export interface RestaurantFilter {
  headcount: number
  budget?: number
  neighborhood?: string
  cuisine?: string
  requiresPrivateDining?: boolean
  minPrivateDiningCapacity?: number
  priceLevel?: number
}

/**
 * Find restaurants matching the given criteria
 */
export function findMatchingRestaurants(filter: RestaurantFilter): DemoRestaurant[] {
  return DEMO_RESTAURANTS.filter((restaurant) => {
    // Must accommodate headcount
    if (restaurant.capacityMax < filter.headcount) {
      return false
    }

    // Check budget if provided (based on per-person cost)
    if (filter.budget && filter.headcount > 0) {
      const perPersonBudget = filter.budget / filter.headcount
      if (restaurant.pricePerPersonMin > perPersonBudget * 1.2) {
        return false
      }
    }

    // Match neighborhood if specified
    if (filter.neighborhood) {
      const normalizedNeighborhood = filter.neighborhood.toLowerCase().trim()
      if (!restaurant.neighborhood.toLowerCase().includes(normalizedNeighborhood)) {
        return false
      }
    }

    // Match cuisine if specified
    if (filter.cuisine) {
      const normalizedCuisine = filter.cuisine.toLowerCase().trim()
      if (!restaurant.cuisine.toLowerCase().includes(normalizedCuisine)) {
        return false
      }
    }

    // Check private dining requirement
    if (filter.requiresPrivateDining && !restaurant.hasPrivateDining) {
      return false
    }

    // Check private dining capacity
    if (filter.minPrivateDiningCapacity && restaurant.hasPrivateDining) {
      if ((restaurant.privateDiningCapacityMax || 0) < filter.minPrivateDiningCapacity) {
        return false
      }
    }

    // Check price level
    if (filter.priceLevel && restaurant.priceLevel > filter.priceLevel) {
      return false
    }

    return true
  }).sort((a, b) => {
    let scoreA = 0
    let scoreB = 0

    // Neighborhood match bonus
    if (filter.neighborhood) {
      const normalizedNeighborhood = filter.neighborhood.toLowerCase().trim()
      if (a.neighborhood.toLowerCase().includes(normalizedNeighborhood)) scoreA += 10
      if (b.neighborhood.toLowerCase().includes(normalizedNeighborhood)) scoreB += 10
    }

    // Cuisine match bonus
    if (filter.cuisine) {
      const normalizedCuisine = filter.cuisine.toLowerCase().trim()
      if (a.cuisine.toLowerCase().includes(normalizedCuisine)) scoreA += 10
      if (b.cuisine.toLowerCase().includes(normalizedCuisine)) scoreB += 10
    }

    // Private dining capacity fit
    if (filter.requiresPrivateDining && a.hasPrivateDining && b.hasPrivateDining) {
      const fitA = (a.privateDiningCapacityMax || 0) >= filter.headcount ? 5 : 0
      const fitB = (b.privateDiningCapacityMax || 0) >= filter.headcount ? 5 : 0
      scoreA += fitA
      scoreB += fitB
    }

    // Price fit (prefer within budget)
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

// ============================================================================
// Conversion Functions
// ============================================================================

/**
 * Convert demo restaurant to entity input format
 */
export function demoRestaurantToEntity(restaurant: DemoRestaurant): DiscoveredEntityInput {
  return {
    name: restaurant.name,
    tags: ['restaurant', restaurant.cuisine.toLowerCase()],
    location: `${restaurant.neighborhood}, ${restaurant.city}`,
    website: restaurant.website,
    email: restaurant.email,
    phone: restaurant.phone,
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
    neighborhood: restaurant.neighborhood,
    city: restaurant.city,
    discoverySource: 'demo',
    cuisine: restaurant.cuisine,
    priceLevel: restaurant.priceLevel,
    hasPrivateDining: restaurant.hasPrivateDining,
    privateDiningCapacityMin: restaurant.privateDiningCapacityMin,
    privateDiningCapacityMax: restaurant.privateDiningCapacityMax,
    privateDiningMinimum: restaurant.privateDiningMinimum,
  }
}

/**
 * Convert discovered restaurant (from API) to entity input format
 */
export function discoveredRestaurantToEntity(restaurant: DiscoveredRestaurant): DiscoveredEntityInput {
  const tags = ['restaurant']
  if (restaurant.cuisine) tags.push(restaurant.cuisine.toLowerCase())
  if (restaurant.hasPrivateDining) tags.push('private_dining')

  return {
    name: restaurant.name,
    tags,
    location: restaurant.address || (restaurant.neighborhood ? `${restaurant.neighborhood}, ${restaurant.city}` : restaurant.city),
    website: restaurant.website,
    email: restaurant.email,
    phone: restaurant.phone,
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
    neighborhood: restaurant.neighborhood,
    city: restaurant.city,
    discoverySource: restaurant.discoverySource,
    googlePlaceId: restaurant.googlePlaceId,
    rating: restaurant.rating,
    emailConfidence: restaurant.emailConfidence,
    cuisine: restaurant.cuisine,
    priceLevel: restaurant.priceLevel,
    hasPrivateDining: restaurant.hasPrivateDining,
    privateDiningCapacityMin: restaurant.privateDiningCapacityMin,
    privateDiningCapacityMax: restaurant.privateDiningCapacityMax,
    privateDiningMinimum: restaurant.privateDiningMinimum,
    resyVenueId: restaurant.resyVenueId,
    opentableId: restaurant.opentableId,
    beliRank: restaurant.beliRank,
  }
}

/** @deprecated Use demoRestaurantToEntity instead */
export const demoRestaurantToVendor = demoRestaurantToEntity
