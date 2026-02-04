'use server'

/**
 * @deprecated This file is deprecated. Use entities.ts instead.
 *
 * All exports are re-exported from entities.ts for backwards compatibility.
 * Migration path:
 *   - getVendorsByEvent → getEntitiesByEvent
 *   - createVendorsFromDiscovery → createEntitiesFromDiscovery
 *   - bulkDeleteVendors → bulkRemoveEntitiesFromEvent
 */

export {
  // Entity CRUD
  createEntity,
  getEntity,
  updateEntity,
  deleteEntity,

  // Event-Entity operations
  addEntityToEvent,
  removeEntityFromEvent,
  getEntitiesByEvent,
  updateEventEntityStatus,
  bulkRemoveEntitiesFromEvent,

  // Discovery
  discoverRestaurantsForEvent,
  createEntitiesFromDiscovery,

  // Types
  type DiscoveredEntityInput,

  // Legacy aliases
  getVendorsByEvent,
  createVendorsFromDiscovery,
  bulkDeleteVendors,
} from './entities'

// Re-export legacy type for compatibility
export type DiscoveredVendorInput = import('./entities').DiscoveredEntityInput
