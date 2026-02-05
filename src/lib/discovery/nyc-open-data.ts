/**
 * NYC Open Data Restaurant Parser
 * Parses DOHMH Restaurant Inspection Results CSV
 * and transforms to entity format for bulk import
 */

import { mapNTAToNeighborhood, BORO_CODE_TO_NAME } from './nta-mapping'

// CSV column indices (based on DOHMH format)
const COLUMNS = {
  CAMIS: 0,           // Unique restaurant ID
  DBA: 1,             // Business name
  BORO: 2,            // Borough
  BUILDING: 3,        // Building number
  STREET: 4,          // Street name
  ZIPCODE: 5,         // ZIP code
  PHONE: 6,           // Phone number
  CUISINE: 7,         // Cuisine description
  INSPECTION_DATE: 8, // For deduplication (keep most recent)
  LATITUDE: 18,       // Latitude
  LONGITUDE: 19,      // Longitude
  NTA: 25,            // Neighborhood Tabulation Area code
} as const

/**
 * Parsed restaurant from NYC Open Data
 */
export interface NYCRestaurant {
  camis: string
  name: string
  borough: string
  address: string
  zipcode: string
  phone: string
  cuisine: string
  latitude: number | null
  longitude: number | null
  neighborhood: string | undefined
  inspectionDate: Date | null
}

/**
 * Entity input format for database insertion
 */
export interface NYCRestaurantEntity {
  name: string
  tags: string[]
  address: string
  neighborhood: string | undefined
  city: string
  latitude: number | null
  longitude: number | null
  metadata: {
    camis: string
    borough: string
    zipcode: string
    phone: string
    cuisine: string
    discovery_source: 'nyc_open_data'
  }
}

/**
 * Parse a single CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"'
        i++
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

/**
 * Parse phone number to consistent format
 */
function formatPhone(phone: string): string {
  // Remove non-digits
  const digits = phone.replace(/\D/g, '')

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  return phone
}

/**
 * Parse inspection date
 */
function parseInspectionDate(dateStr: string): Date | null {
  if (!dateStr || dateStr === '01/01/1900') return null

  const [month, day, year] = dateStr.split('/')
  if (!month || !day || !year) return null

  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  return isNaN(date.getTime()) ? null : date
}

/**
 * Parse NYC Open Data CSV content
 * Returns deduplicated restaurants (one per CAMIS, keeping most recent inspection)
 */
export function parseNYCOpenDataCSV(csvContent: string): NYCRestaurant[] {
  const lines = csvContent.split('\n')

  // Skip header
  const dataLines = lines.slice(1).filter(line => line.trim())

  // Map to store restaurants by CAMIS (for deduplication)
  const restaurantMap = new Map<string, { restaurant: NYCRestaurant; date: Date | null }>()

  for (const line of dataLines) {
    const fields = parseCSVLine(line)

    const camis = fields[COLUMNS.CAMIS]
    if (!camis) continue

    const name = fields[COLUMNS.DBA]
    if (!name) continue

    const inspectionDate = parseInspectionDate(fields[COLUMNS.INSPECTION_DATE])
    const boro = fields[COLUMNS.BORO]
    const nta = fields[COLUMNS.NTA]

    // Parse coordinates
    const latStr = fields[COLUMNS.LATITUDE]
    const lngStr = fields[COLUMNS.LONGITUDE]
    const latitude = latStr ? parseFloat(latStr) : null
    const longitude = lngStr ? parseFloat(lngStr) : null

    const restaurant: NYCRestaurant = {
      camis,
      name,
      borough: BORO_CODE_TO_NAME[boro] || boro,
      address: `${fields[COLUMNS.BUILDING]} ${fields[COLUMNS.STREET]}`.trim(),
      zipcode: fields[COLUMNS.ZIPCODE],
      phone: formatPhone(fields[COLUMNS.PHONE] || ''),
      cuisine: fields[COLUMNS.CUISINE] || '',
      latitude: latitude && !isNaN(latitude) ? latitude : null,
      longitude: longitude && !isNaN(longitude) ? longitude : null,
      neighborhood: mapNTAToNeighborhood(nta, boro),
      inspectionDate,
    }

    // Keep most recent record per restaurant
    const existing = restaurantMap.get(camis)
    if (!existing) {
      restaurantMap.set(camis, { restaurant, date: inspectionDate })
    } else if (inspectionDate && (!existing.date || inspectionDate > existing.date)) {
      restaurantMap.set(camis, { restaurant, date: inspectionDate })
    }
  }

  return Array.from(restaurantMap.values()).map(v => v.restaurant)
}

/**
 * Transform parsed restaurants to entity format for database insertion
 */
export function transformToEntities(restaurants: NYCRestaurant[]): NYCRestaurantEntity[] {
  return restaurants.map(r => ({
    name: r.name,
    tags: ['restaurant', r.cuisine.toLowerCase()].filter(Boolean),
    address: r.address,
    neighborhood: r.neighborhood,
    city: 'New York',
    latitude: r.latitude,
    longitude: r.longitude,
    metadata: {
      camis: r.camis,
      borough: r.borough,
      zipcode: r.zipcode,
      phone: r.phone,
      cuisine: r.cuisine,
      discovery_source: 'nyc_open_data' as const,
    },
  }))
}

/**
 * Get statistics about parsed data
 */
export function getParseStats(restaurants: NYCRestaurant[]): {
  total: number
  byBorough: Record<string, number>
  withCoordinates: number
  withPhone: number
  cuisineTypes: number
} {
  const byBorough: Record<string, number> = {}
  let withCoordinates = 0
  let withPhone = 0
  const cuisines = new Set<string>()

  for (const r of restaurants) {
    byBorough[r.borough] = (byBorough[r.borough] || 0) + 1
    if (r.latitude && r.longitude) withCoordinates++
    if (r.phone) withPhone++
    if (r.cuisine) cuisines.add(r.cuisine)
  }

  return {
    total: restaurants.length,
    byBorough,
    withCoordinates,
    withPhone,
    cuisineTypes: cuisines.size,
  }
}

/**
 * Filter restaurants by borough
 */
export function filterByBorough(restaurants: NYCRestaurant[], boroughs: string[]): NYCRestaurant[] {
  if (boroughs.length === 0) return restaurants
  const boroughSet = new Set(boroughs.map(b => b.toLowerCase()))
  return restaurants.filter(r => boroughSet.has(r.borough.toLowerCase()))
}

/**
 * Filter restaurants with valid coordinates
 */
export function filterWithCoordinates(restaurants: NYCRestaurant[]): NYCRestaurant[] {
  return restaurants.filter(r => r.latitude && r.longitude)
}
