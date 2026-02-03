import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format currency with dollar sign and thousands separator
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString()}`
}

/**
 * Format preferred dates for display in outreach emails
 */
export function formatPreferredDates(dates: { date: string; rank: number }[]): string {
  return dates
    .map((d, idx) => `${idx + 1}. ${format(new Date(d.date), 'MMMM d, yyyy')}`)
    .join('\n')
}

/**
 * Build a list of event constraint descriptions for emails
 */
export function buildConstraintsList(constraints: {
  ada?: boolean
  alcohol?: boolean
  indoor_outdoor?: 'indoor' | 'outdoor' | 'either'
  venue_types?: string[]
  neighborhood?: string
  time_frame?: 'morning' | 'afternoon' | 'evening' | 'night'
  catering?: {
    food?: boolean
    drinks?: boolean
    external_vendors_allowed?: boolean
  }
}): string[] {
  const list: string[] = []
  if (constraints.ada) list.push('ADA accessible')
  if (constraints.alcohol) list.push('alcohol service')
  if (constraints.indoor_outdoor && constraints.indoor_outdoor !== 'either') {
    list.push(`${constraints.indoor_outdoor} space preferred`)
  }
  if (constraints.venue_types?.length) {
    list.push(`venue type: ${constraints.venue_types.join(', ')}`)
  }
  if (constraints.neighborhood) {
    list.push(`neighborhood: ${constraints.neighborhood}`)
  }
  if (constraints.time_frame) {
    list.push(`time: ${constraints.time_frame}`)
  }
  if (constraints.catering?.food) {
    list.push('needs food catering')
  }
  if (constraints.catering?.drinks) {
    list.push('needs drinks/bar service')
  }
  return list
}

/**
 * Standard page container class for consistent layout
 */
export const PAGE_CONTAINER_CLASS = "px-8 py-8"

// ============================================================================
// UUID Validation
// ============================================================================

/**
 * UUID validation regex - validates standard UUID v4 format
 */
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Validates if a string is a valid UUID
 */
export function isValidUUID(id: string | null | undefined): boolean {
  return !!id && UUID_REGEX.test(id)
}

/**
 * Validates a UUID and throws an error if invalid.
 * Use this for consistent validation with throwing behavior.
 */
export function validateUUID(id: string | null | undefined, entityName: string = 'ID'): void {
  if (!isValidUUID(id)) {
    throw new Error(`Invalid ${entityName}`)
  }
}

/**
 * Validates multiple UUIDs and throws an error if any are invalid.
 */
export function validateUUIDs(ids: string[], entityName: string = 'ID'): void {
  for (const id of ids) {
    if (!isValidUUID(id)) {
      throw new Error(`Invalid ${entityName}: ${id}`)
    }
  }
}

// ============================================================================
// Supabase Helpers
// ============================================================================

/**
 * Normalizes a Supabase join result that could be an array or single object.
 * Supabase returns arrays for many-to-many, but often we just need the first item.
 */
export function normalizeJoinResult<T>(result: T | T[] | null | undefined): T | null {
  if (!result) return null
  return Array.isArray(result) ? result[0] ?? null : result
}

// ============================================================================
// Formatting Helpers
// ============================================================================

/**
 * Build an email signature from user profile data.
 * Returns a formatted signature string for use in emails.
 */
export function buildEmailSignature(profile: {
  name?: string | null
  title?: string | null
  company_name?: string | null
  email_signature?: string | null
} | null): string {
  if (!profile) {
    return 'Event Planning Team'
  }

  // Use custom signature if provided
  if (profile.email_signature) {
    return profile.email_signature
  }

  // Build from profile fields
  if (profile.name) {
    if (profile.title && profile.company_name) {
      return `${profile.name}\n${profile.title}, ${profile.company_name}`
    }
    if (profile.company_name) {
      return `${profile.name}\n${profile.company_name}`
    }
    return profile.name
  }

  return 'Event Planning Team'
}

/**
 * Group vendors by their thread status for summary displays.
 */
export function groupVendorsByStatus<T extends { name: string; vendor_threads?: { status: string } | null }>(
  vendors: T[]
): Record<string, string[]> {
  const grouped: Record<string, string[]> = {}
  vendors.forEach((v) => {
    const status = v.vendor_threads?.status || 'NOT_CONTACTED'
    if (!grouped[status]) {
      grouped[status] = []
    }
    grouped[status].push(v.name)
  })
  return grouped
}
