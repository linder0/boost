/**
 * Shared Log Utilities
 * Common types and formatting functions for discovery/activity logs
 */

// ============================================================================
// Types
// ============================================================================

export interface LogEntry {
  id: string
  timestamp: Date
  message: string
  level?: 'info' | 'success' | 'warn' | 'error'
}

// ============================================================================
// Formatting Functions
// ============================================================================

/**
 * Format a date as a time string (HH:mm:ss)
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/**
 * Get the color class for a log level
 */
export function getLevelColor(level?: string): string {
  switch (level) {
    case 'success':
      return 'text-green-600'
    case 'warn':
      return 'text-yellow-600'
    case 'error':
      return 'text-red-600'
    default:
      return 'text-muted-foreground'
  }
}

/**
 * Get the icon for a log level
 */
export function getLevelIcon(level?: string): string {
  switch (level) {
    case 'success':
      return '✓'
    case 'warn':
      return '⚠'
    case 'error':
      return '✗'
    default:
      return '→'
  }
}

/**
 * Create a new log entry
 */
export function createLogEntry(
  message: string,
  level?: LogEntry['level']
): LogEntry {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date(),
    message,
    level,
  }
}
