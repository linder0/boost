/**
 * Entity Module
 * VROOM Select: Restaurant-focused configuration and utilities
 */

export {
  // Types
  type EntityCategory,
  type SearchTypeConfig,
  type EntityTypeConfig,
  type CuisineType,
  type NYCNeighborhood,

  // Configuration
  ENTITY_CATEGORY_CONFIG,
  SEARCH_TYPE_CONFIG,
  CUISINE_TYPES,
  NYC_NEIGHBORHOODS,

  // Utility functions
  getEntityConfig,
  getSearchConfig,
  getCategoryLabel,
  getSearchTypes,
  getSearchTypesForSource,
  sortCategories,
  groupByCategory,
} from './config'
