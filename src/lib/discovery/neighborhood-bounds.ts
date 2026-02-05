/**
 * NYC Neighborhood geographic bounds for location-restricted searches
 * Derived from polygon coordinates in neighborhood-picker.tsx
 */

export interface NeighborhoodBounds {
  center: { lat: number; lng: number }
  // Bounding box for Google Places API locationRestriction
  southwest: { lat: number; lng: number }
  northeast: { lat: number; lng: number }
}

// Bounding boxes calculated from polygon coordinates
export const NYC_NEIGHBORHOOD_BOUNDS: Record<string, NeighborhoodBounds> = {
  'Tribeca': {
    center: { lat: 40.720388, lng: -74.012152 },
    southwest: { lat: 40.711372, lng: -74.016390 },
    northeast: { lat: 40.725744, lng: -74.001886 },
  },
  'SoHo': {
    center: { lat: 40.725506, lng: -74.007126 },
    southwest: { lat: 40.717977, lng: -74.015204 },
    northeast: { lat: 40.729832, lng: -73.995395 },
  },
  'West Village': {
    center: { lat: 40.737405, lng: -74.011020 },
    southwest: { lat: 40.728347, lng: -74.014391 },
    northeast: { lat: 40.742378, lng: -73.996797 },
  },
  'East Village': {
    center: { lat: 40.725476, lng: -73.979482 },
    southwest: { lat: 40.718589, lng: -73.992604 },
    northeast: { lat: 40.734782, lng: -73.971629 },
  },
  'Chelsea': {
    center: { lat: 40.747798, lng: -74.008900 },
    southwest: { lat: 40.737098, lng: -74.012119 },
    northeast: { lat: 40.757972, lng: -73.987933 },
  },
  'Flatiron': {
    center: { lat: 40.740337, lng: -73.987144 },
    southwest: { lat: 40.738311, lng: -73.994211 },
    northeast: { lat: 40.744763, lng: -73.983381 },
  },
  'Gramercy': {
    center: { lat: 40.736509, lng: -73.984571 },
    southwest: { lat: 40.731375, lng: -73.991725 },
    northeast: { lat: 40.739502, lng: -73.978520 },
  },
  'Midtown': {
    center: { lat: 40.758724, lng: -73.979019 },
    southwest: { lat: 40.741375, lng: -73.993464 },
    northeast: { lat: 40.768400, lng: -73.958788 },
  },
  'Upper East Side': {
    center: { lat: 40.775407, lng: -73.946648 },
    southwest: { lat: 40.758213, lng: -73.973015 },
    northeast: { lat: 40.787907, lng: -73.942003 },
  },
  'Upper West Side': {
    center: { lat: 40.787417, lng: -73.975500 },
    southwest: { lat: 40.768400, lng: -73.990000 },
    northeast: { lat: 40.800000, lng: -73.958000 },
  },
  'Lower East Side': {
    center: { lat: 40.718950, lng: -73.988820 },
    southwest: { lat: 40.710000, lng: -73.995000 },
    northeast: { lat: 40.726000, lng: -73.975000 },
  },
  'Nolita': {
    center: { lat: 40.721780, lng: -73.995500 },
    southwest: { lat: 40.717000, lng: -74.000000 },
    northeast: { lat: 40.726000, lng: -73.990000 },
  },
  'Little Italy': {
    center: { lat: 40.719500, lng: -73.997500 },
    southwest: { lat: 40.715000, lng: -74.002000 },
    northeast: { lat: 40.723000, lng: -73.993000 },
  },
  'Chinatown': {
    center: { lat: 40.715756, lng: -73.997183 },
    southwest: { lat: 40.710000, lng: -74.005000 },
    northeast: { lat: 40.720000, lng: -73.990000 },
  },
  'Greenwich Village': {
    center: { lat: 40.733580, lng: -73.999410 },
    southwest: { lat: 40.725000, lng: -74.007000 },
    northeast: { lat: 40.740000, lng: -73.992000 },
  },
  'NoHo': {
    center: { lat: 40.728500, lng: -73.992500 },
    southwest: { lat: 40.724000, lng: -73.998000 },
    northeast: { lat: 40.733000, lng: -73.988000 },
  },
  'Murray Hill': {
    center: { lat: 40.748200, lng: -73.977000 },
    southwest: { lat: 40.742000, lng: -73.985000 },
    northeast: { lat: 40.752000, lng: -73.970000 },
  },
  'Kips Bay': {
    center: { lat: 40.742000, lng: -73.979000 },
    southwest: { lat: 40.736000, lng: -73.985000 },
    northeast: { lat: 40.748000, lng: -73.972000 },
  },
  'Financial District': {
    center: { lat: 40.708000, lng: -74.010000 },
    southwest: { lat: 40.700000, lng: -74.020000 },
    northeast: { lat: 40.715000, lng: -74.000000 },
  },
  'Hell\'s Kitchen': {
    center: { lat: 40.763500, lng: -73.991000 },
    southwest: { lat: 40.755000, lng: -74.000000 },
    northeast: { lat: 40.772000, lng: -73.982000 },
  },
  // Brooklyn neighborhoods
  'Williamsburg': {
    center: { lat: 40.714000, lng: -73.953000 },
    southwest: { lat: 40.700000, lng: -73.970000 },
    northeast: { lat: 40.725000, lng: -73.935000 },
  },
  'DUMBO': {
    center: { lat: 40.703500, lng: -73.988000 },
    southwest: { lat: 40.698000, lng: -73.995000 },
    northeast: { lat: 40.708000, lng: -73.980000 },
  },
  'Brooklyn Heights': {
    center: { lat: 40.696000, lng: -73.993000 },
    southwest: { lat: 40.688000, lng: -74.000000 },
    northeast: { lat: 40.702000, lng: -73.985000 },
  },
  'Greenpoint': {
    center: { lat: 40.730000, lng: -73.951000 },
    southwest: { lat: 40.720000, lng: -73.965000 },
    northeast: { lat: 40.740000, lng: -73.935000 },
  },
  'Fort Greene': {
    center: { lat: 40.689000, lng: -73.976000 },
    southwest: { lat: 40.682000, lng: -73.985000 },
    northeast: { lat: 40.696000, lng: -73.968000 },
  },
}

/**
 * Get bounding box for a neighborhood
 * Returns null if neighborhood not found
 */
export function getNeighborhoodBounds(neighborhood: string): NeighborhoodBounds | null {
  return NYC_NEIGHBORHOOD_BOUNDS[neighborhood] || null
}
