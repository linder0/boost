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
export const PAGE_CONTAINER_CLASS = "mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
