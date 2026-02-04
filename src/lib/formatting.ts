/**
 * Formatting Utilities
 * Centralized formatting functions for consistent display across the app
 */

// ============================================================================
// Capacity Formatting
// ============================================================================

/**
 * Format capacity range for display
 * Supports both simple min/max and private dining capacity fields
 */
export function formatCapacity(
  capacityMin?: number | null,
  capacityMax?: number | null,
  privateDiningCapacityMin?: number | null,
  privateDiningCapacityMax?: number | null
): string {
  // Prefer private dining capacity if available
  const min = privateDiningCapacityMin ?? capacityMin
  const max = privateDiningCapacityMax ?? capacityMax

  if (min && max) return `${min}-${max}`
  if (max) return `Up to ${max}`
  if (min) return `${min}+`
  return '-'
}

/**
 * Format capacity from a vendor-like object
 */
export function formatCapacityFromVendor(vendor: {
  capacityMin?: number | null
  capacityMax?: number | null
  privateDiningCapacityMin?: number | null
  privateDiningCapacityMax?: number | null
}): string {
  return formatCapacity(
    vendor.capacityMin,
    vendor.capacityMax,
    vendor.privateDiningCapacityMin,
    vendor.privateDiningCapacityMax
  )
}

// ============================================================================
// Price Formatting
// ============================================================================

/**
 * Format price level as dollar signs
 * @param level - Price level (1-4)
 * @returns Dollar sign string (e.g., "$$$")
 */
export function formatPriceLevel(level?: number | null): string {
  if (!level || level < 1) return ''
  return '$'.repeat(Math.min(level, 4))
}

/**
 * Format minimum spend for display
 */
export function formatMinimum(minimum?: number | null): string {
  if (!minimum) return '-'
  return `$${minimum.toLocaleString()}`
}

// ============================================================================
// Source Formatting
// ============================================================================

export type DiscoverySourceType =
  | 'google_places'
  | 'resy'
  | 'opentable'
  | 'beli'
  | 'demo'
  | 'manual'
  | 'csv'
  | string

export interface SourceDisplay {
  label: string
  color: string
}

/**
 * Get display information for a discovery source
 * Returns label and Tailwind color classes
 */
export function getSourceDisplay(source?: string | null): SourceDisplay | null {
  if (!source) return null

  switch (source) {
    case 'google_places':
      return { label: 'Google', color: 'text-blue-600 border-blue-300' }
    case 'resy':
      return { label: 'Resy', color: 'text-purple-600 border-purple-300' }
    case 'opentable':
      return { label: 'OpenTable', color: 'text-red-600 border-red-300' }
    case 'beli':
      return { label: 'Beli', color: 'text-orange-600 border-orange-300' }
    case 'demo':
      return { label: 'Demo', color: 'text-gray-600 border-gray-300' }
    case 'manual':
      return { label: 'Manual', color: 'text-green-600 border-green-300' }
    case 'csv':
      return { label: 'CSV', color: 'text-cyan-600 border-cyan-300' }
    default:
      return { label: source, color: 'text-gray-600 border-gray-300' }
  }
}

/**
 * Get just the label for a discovery source
 * Simpler version when color is not needed
 */
export function formatSource(source?: string | null): string {
  const display = getSourceDisplay(source)
  return display?.label ?? '-'
}
