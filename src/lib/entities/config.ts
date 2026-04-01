/**
 * Central Entity Configuration
 * VROOM Select: Restaurant-focused configuration for NYC dinner events
 */

// Entity category type - simplified to Restaurant only
export type EntityCategory = 'Restaurant'

// Search type configuration for discovery APIs
export interface SearchTypeConfig {
  query: string
  category: EntityCategory
  // Source hints for which APIs to use
  sources: ('google_places' | 'resy' | 'opentable')[]
}

// Entity type configuration
export interface EntityTypeConfig {
  label: string
  pluralLabel: string
  icon: string
  searchQueries: string[]
  defaultCapacity?: { min: number; max: number }
  defaultPriceRange?: { min: number; max: number }
}

/**
 * Master configuration for Restaurant category
 */
export const ENTITY_CATEGORY_CONFIG: Record<EntityCategory, EntityTypeConfig> = {
  Restaurant: {
    label: 'Restaurant',
    pluralLabel: 'Restaurants',
    icon: 'utensils',
    searchQueries: ['restaurant', 'private_dining', 'group_dining'],
    defaultCapacity: { min: 10, max: 100 },
    defaultPriceRange: { min: 75, max: 200 },
  },
}

/**
 * Search type to discovery query mapping
 * Used for Google Places and other discovery sources
 */
export const SEARCH_TYPE_CONFIG: Record<string, SearchTypeConfig> = {
  restaurant: {
    query: 'restaurant private dining events',
    category: 'Restaurant',
    sources: ['google_places', 'resy', 'opentable'],
  },
  private_dining: {
    query: 'private dining room restaurant',
    category: 'Restaurant',
    sources: ['google_places', 'opentable'],
  },
  group_dining: {
    query: 'group dinner restaurant large party',
    category: 'Restaurant',
    sources: ['google_places', 'resy'],
  },
  italian: {
    query: 'italian restaurant private dining',
    category: 'Restaurant',
    sources: ['google_places', 'resy'],
  },
  japanese: {
    query: 'japanese restaurant private dining omakase',
    category: 'Restaurant',
    sources: ['google_places', 'resy'],
  },
  steakhouse: {
    query: 'steakhouse private dining',
    category: 'Restaurant',
    sources: ['google_places', 'opentable'],
  },
  french: {
    query: 'french restaurant private dining',
    category: 'Restaurant',
    sources: ['google_places', 'resy'],
  },
  american: {
    query: 'american restaurant private events',
    category: 'Restaurant',
    sources: ['google_places', 'opentable'],
  },
}

/**
 * Available cuisine types for filtering
 */
export const CUISINE_TYPES = [
  'Italian',
  'Japanese',
  'French',
  'American',
  'Steakhouse',
  'Mediterranean',
  'Mexican',
  'Chinese',
  'Indian',
  'Thai',
  'Korean',
  'Seafood',
  'Contemporary',
  'Farm-to-Table',
] as const

export type CuisineType = typeof CUISINE_TYPES[number]

/**
 * NYC neighborhoods for filtering
 */
export const NYC_NEIGHBORHOODS = [
  'Manhattan',
  'Midtown',
  'Upper East Side',
  'Upper West Side',
  'West Village',
  'East Village',
  'SoHo',
  'Tribeca',
  'Chelsea',
  'Flatiron',
  'Gramercy',
  'Lower East Side',
  'Financial District',
  'Williamsburg',
  'DUMBO',
  'Brooklyn Heights',
  'Park Slope',
  'Greenpoint',
] as const

export type NYCNeighborhood = typeof NYC_NEIGHBORHOODS[number]

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get configuration for the Restaurant category
 */
export function getEntityConfig(): EntityTypeConfig {
  return ENTITY_CATEGORY_CONFIG.Restaurant
}

/**
 * Get the search config for a search type
 */
export function getSearchConfig(searchType: string): SearchTypeConfig | undefined {
  return SEARCH_TYPE_CONFIG[searchType.toLowerCase()]
}

/**
 * Get category label (singular or plural)
 */
export function getCategoryLabel(plural = false): string {
  const config = ENTITY_CATEGORY_CONFIG.Restaurant
  return plural ? config.pluralLabel : config.label
}

/**
 * Get all available search types
 */
export function getSearchTypes(): string[] {
  return Object.keys(SEARCH_TYPE_CONFIG)
}

/**
 * Get search types for a specific source
 */
export function getSearchTypesForSource(source: 'google_places' | 'resy' | 'opentable'): string[] {
  return Object.entries(SEARCH_TYPE_CONFIG)
    .filter(([, config]) => config.sources.includes(source))
    .map(([key]) => key)
}

/**
 * Group items by a field (for backwards compatibility)
 */
export function groupByCategory<T extends { category?: string }>(
  items: T[]
): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const category = item.category || 'Restaurant'
    if (!acc[category]) acc[category] = []
    acc[category].push(item)
    return acc
  }, {} as Record<string, T[]>)
}

/**
 * Sort categories (simplified - just returns as-is since we only have one)
 */
export function sortCategories(categories: string[]): string[] {
  return categories
}
