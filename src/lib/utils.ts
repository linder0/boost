import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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
 * Standard page container class for consistent layout
 */
export const PAGE_CONTAINER_CLASS = "px-8 py-8"

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
 * Normalizes a Supabase join result that could be an array or single object.
 * Supabase returns arrays for many-to-many, but often we just need the first item.
 */
export function normalizeJoinResult<T>(result: T | T[] | null | undefined): T | null {
  if (!result) return null
  return Array.isArray(result) ? result[0] ?? null : result
}
