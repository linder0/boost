'use client'

import { Progress } from '@/components/ui/progress'

// ============================================================================
// Shared types for SSE stream displays
// ============================================================================

export interface StreamProgress {
  percent: number
  processed: number
  total: number
  message?: string
}

export interface StreamLog {
  message: string
  timestamp?: Date
}

// ============================================================================
// Error Alert Component
// ============================================================================

interface ErrorAlertProps {
  error: string
  onDismiss?: () => void
}

export function ErrorAlert({ error, onDismiss }: ErrorAlertProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex justify-between items-start">
        <div className="flex gap-2">
          <span className="text-red-500">✕</span>
          <div>
            <p className="font-medium text-red-800">Error</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-400 hover:text-red-600"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Progress Display Component
// ============================================================================

interface ProgressDisplayProps {
  progress: StreamProgress
  className?: string
}

export function ProgressDisplay({ progress, className = '' }: ProgressDisplayProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between text-sm text-gray-600">
        <span>
          {progress.processed.toLocaleString()} / {progress.total.toLocaleString()}
        </span>
        <span>{progress.percent}%</span>
      </div>
      <Progress value={progress.percent} className="h-2" />
      {progress.message && (
        <p className="text-sm text-gray-500">{progress.message}</p>
      )}
    </div>
  )
}

// ============================================================================
// Log Display Component
// ============================================================================

interface LogDisplayProps {
  logs: StreamLog[]
  maxHeight?: string
  className?: string
}

export function LogDisplay({ logs, maxHeight = '200px', className = '' }: LogDisplayProps) {
  if (logs.length === 0) return null

  return (
    <div
      className={`bg-gray-50 rounded border border-gray-200 p-3 font-mono text-xs overflow-auto ${className}`}
      style={{ maxHeight }}
    >
      {logs.map((log, i) => (
        <div key={i} className="text-gray-600">
          {log.timestamp && (
            <span className="text-gray-400 mr-2">
              [{log.timestamp.toLocaleTimeString()}]
            </span>
          )}
          {log.message}
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// Stats Grid Component
// ============================================================================

interface Stat {
  label: string
  value: number | string
  color?: 'default' | 'success' | 'warning' | 'error'
}

interface StatsGridProps {
  stats: Stat[]
  columns?: 2 | 3 | 4
  className?: string
}

const colorClasses = {
  default: 'text-gray-900',
  success: 'text-green-600',
  warning: 'text-yellow-600',
  error: 'text-red-600',
}

export function StatsGrid({ stats, columns = 4, className = '' }: StatsGridProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  }

  return (
    <div className={`grid ${gridCols[columns]} gap-4 ${className}`}>
      {stats.map((stat, i) => (
        <div key={i} className="text-center p-3 bg-gray-50 rounded-lg">
          <div className={`text-2xl font-bold ${colorClasses[stat.color || 'default']}`}>
            {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
          </div>
          <div className="text-sm text-gray-500">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// SSE Stream Helper
// ============================================================================

export interface SSECallbacks<T = Record<string, unknown>> {
  onEvent?: (type: string, data: T) => void
  onComplete?: (data: T) => void
  onError?: (error: string) => void
}

/**
 * Helper to parse SSE streams with typed events
 */
export async function parseSSEStream<T = Record<string, unknown>>(
  response: Response,
  callbacks: SSECallbacks<T>
): Promise<void> {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6)) as T & { type: string }

          callbacks.onEvent?.(data.type, data)

          if (data.type === 'complete') {
            callbacks.onComplete?.(data)
          } else if (data.type === 'error') {
            callbacks.onError?.((data as Record<string, unknown>).message as string || 'Unknown error')
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }
}
