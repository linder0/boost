/**
 * Legacy Demo Venues - DEPRECATED
 * This file is maintained for backwards compatibility.
 * Use src/lib/demo/restaurants.ts for new code.
 */

// Re-export from restaurants.ts with legacy names
export {
  DEMO_RESTAURANTS as DEMO_VENUES,
  findMatchingRestaurants as findMatchingVenues,
  demoRestaurantToVendor as demoVenueToVendor,
  type DemoRestaurant as DemoVenue,
  type RestaurantFilter as VenueFilter,
} from './restaurants'
