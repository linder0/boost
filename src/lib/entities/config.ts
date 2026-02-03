/**
 * Central Entity Configuration
 * Single source of truth for entity types, categories, and discovery parameters
 */

// Entity category type - matches database category field
export type EntityCategory = 
  | 'Venue' 
  | 'Caterer' 
  | 'Photographer' 
  | 'DJ' 
  | 'Florist' 
  | 'Planner' 
  | 'Vendor'

// Entity type discriminator
export type EntityType = 'venue' | 'vendor'

// Search type configuration for Google Places API
export interface SearchTypeConfig {
  query: string
  category: EntityCategory
  entityType: EntityType
}

// Entity type configuration
export interface EntityTypeConfig {
  label: string
  pluralLabel: string
  entityType: EntityType
  icon: string
  searchQueries: string[]
  defaultCapacity?: { min: number; max: number }
  defaultPriceRange?: { min: number; max: number }
}

/**
 * Master configuration for all entity categories
 * Used for discovery, display, and categorization
 */
export const ENTITY_CATEGORY_CONFIG: Record<EntityCategory, EntityTypeConfig> = {
  Venue: {
    label: 'Venue',
    pluralLabel: 'Venues',
    entityType: 'venue',
    icon: 'building',
    searchQueries: ['restaurant', 'bar', 'rooftop', 'lounge', 'cafe', 'wellness', 'venue'],
    defaultCapacity: { min: 20, max: 150 },
    defaultPriceRange: { min: 75, max: 150 },
  },
  Caterer: {
    label: 'Caterer',
    pluralLabel: 'Caterers',
    entityType: 'vendor',
    icon: 'utensils',
    searchQueries: ['catering', 'caterer'],
  },
  Photographer: {
    label: 'Photographer',
    pluralLabel: 'Photographers',
    entityType: 'vendor',
    icon: 'camera',
    searchQueries: ['photographer', 'photography'],
  },
  DJ: {
    label: 'DJ',
    pluralLabel: 'DJs',
    entityType: 'vendor',
    icon: 'music',
    searchQueries: ['dj', 'music'],
  },
  Florist: {
    label: 'Florist',
    pluralLabel: 'Florists',
    entityType: 'vendor',
    icon: 'flower',
    searchQueries: ['florist', 'flowers'],
  },
  Planner: {
    label: 'Planner',
    pluralLabel: 'Planners',
    entityType: 'vendor',
    icon: 'clipboard',
    searchQueries: ['planner'],
  },
  Vendor: {
    label: 'Vendor',
    pluralLabel: 'Vendors',
    entityType: 'vendor',
    icon: 'store',
    searchQueries: [],
  },
}

/**
 * Search type to Google Places query mapping
 * Maps user-facing search terms to API queries and categories
 */
export const SEARCH_TYPE_CONFIG: Record<string, SearchTypeConfig> = {
  // Venues
  rooftop: { query: 'rooftop bar private events', category: 'Venue', entityType: 'venue' },
  restaurant: { query: 'restaurant private dining events', category: 'Venue', entityType: 'venue' },
  bar: { query: 'bar private events', category: 'Venue', entityType: 'venue' },
  lounge: { query: 'lounge private events', category: 'Venue', entityType: 'venue' },
  cafe: { query: 'cafe private events', category: 'Venue', entityType: 'venue' },
  wellness: { query: 'spa wellness private events', category: 'Venue', entityType: 'venue' },
  venue: { query: 'event venue private events', category: 'Venue', entityType: 'venue' },
  // Vendors
  caterer: { query: 'catering service events', category: 'Caterer', entityType: 'vendor' },
  catering: { query: 'catering company events', category: 'Caterer', entityType: 'vendor' },
  photographer: { query: 'event photographer', category: 'Photographer', entityType: 'vendor' },
  photography: { query: 'event photography services', category: 'Photographer', entityType: 'vendor' },
  dj: { query: 'DJ entertainment events', category: 'DJ', entityType: 'vendor' },
  music: { query: 'live music entertainment events', category: 'DJ', entityType: 'vendor' },
  florist: { query: 'florist event flowers', category: 'Florist', entityType: 'vendor' },
  flowers: { query: 'event floral arrangements', category: 'Florist', entityType: 'vendor' },
  planner: { query: 'event planner coordinator', category: 'Planner', entityType: 'vendor' },
}

/**
 * Default category sort order (Venue first, then alphabetical)
 */
export const CATEGORY_SORT_ORDER: EntityCategory[] = [
  'Venue',
  'Caterer',
  'DJ',
  'Florist',
  'Photographer',
  'Planner',
  'Vendor',
]

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get configuration for a specific category
 */
export function getEntityConfig(category: EntityCategory): EntityTypeConfig {
  return ENTITY_CATEGORY_CONFIG[category] || ENTITY_CATEGORY_CONFIG.Vendor
}

/**
 * Get the search config for a search type
 */
export function getSearchConfig(searchType: string): SearchTypeConfig | undefined {
  return SEARCH_TYPE_CONFIG[searchType.toLowerCase()]
}

/**
 * Get category from search type
 */
export function getCategoryFromSearchType(searchType: string): EntityCategory {
  const config = getSearchConfig(searchType)
  return config?.category || 'Vendor'
}

/**
 * Get category label (singular or plural)
 */
export function getCategoryLabel(category: EntityCategory, plural = false): string {
  const config = getEntityConfig(category)
  return plural ? config.pluralLabel : config.label
}

/**
 * Sort categories according to defined order (Venue first)
 */
export function sortCategories(categories: string[]): string[] {
  return categories.sort((a, b) => {
    const indexA = CATEGORY_SORT_ORDER.indexOf(a as EntityCategory)
    const indexB = CATEGORY_SORT_ORDER.indexOf(b as EntityCategory)
    
    // If category not in sort order, put it at the end
    const sortA = indexA === -1 ? CATEGORY_SORT_ORDER.length : indexA
    const sortB = indexB === -1 ? CATEGORY_SORT_ORDER.length : indexB
    
    if (sortA !== sortB) return sortA - sortB
    return a.localeCompare(b)
  })
}

/**
 * Check if a category is a venue type
 */
export function isVenueCategory(category: EntityCategory): boolean {
  return getEntityConfig(category).entityType === 'venue'
}

/**
 * Get all venue search types
 */
export function getVenueSearchTypes(): string[] {
  return Object.entries(SEARCH_TYPE_CONFIG)
    .filter(([, config]) => config.entityType === 'venue')
    .map(([key]) => key)
}

/**
 * Get all vendor search types
 */
export function getVendorSearchTypes(): string[] {
  return Object.entries(SEARCH_TYPE_CONFIG)
    .filter(([, config]) => config.entityType === 'vendor')
    .map(([key]) => key)
}

/**
 * Get search types for a specific category
 * Returns the search types that produce results in this category
 */
export function getSearchTypesForCategory(category: EntityCategory): string[] {
  return Object.entries(SEARCH_TYPE_CONFIG)
    .filter(([, config]) => config.category === category)
    .map(([key]) => key)
}

/**
 * Group items by category
 */
export function groupByCategory<T extends { category: string }>(
  items: T[]
): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const category = item.category || 'Other'
    if (!acc[category]) acc[category] = []
    acc[category].push(item)
    return acc
  }, {} as Record<string, T[]>)
}
