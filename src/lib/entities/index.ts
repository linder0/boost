/**
 * Entity Module
 * Central configuration and utilities for venues and vendors
 */

export {
  // Types
  type EntityCategory,
  type EntityType,
  type SearchTypeConfig,
  type EntityTypeConfig,
  
  // Configuration
  ENTITY_CATEGORY_CONFIG,
  SEARCH_TYPE_CONFIG,
  CATEGORY_SORT_ORDER,
  
  // Utility functions
  getEntityConfig,
  getSearchConfig,
  getCategoryFromSearchType,
  getCategoryLabel,
  sortCategories,
  isVenueCategory,
  getVenueSearchTypes,
  getVendorSearchTypes,
  getSearchTypesForCategory,
  groupByCategory,
} from './config'
