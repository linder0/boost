'use client'

import { useEffect, useRef } from 'react'
import { type LogEntry, formatTime, getLevelColor, getLevelIcon } from '@/lib/log-utils'

// Re-export LogEntry for consumers
export type { LogEntry }

interface DiscoveryLogProps {
  logs: LogEntry[]
  isActive?: boolean
}

export function DiscoveryLog({ logs, isActive = false }: DiscoveryLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  return (
    <div
      ref={scrollRef}
      className="h-48 overflow-y-auto rounded-md border bg-muted/30 font-mono text-sm p-4 space-y-1"
    >
      {logs.length === 0 ? (
        <p className="text-muted-foreground">Waiting to start discovery...</p>
      ) : (
        logs.map((log) => (
          <div key={log.id} className="flex gap-2 animate-in fade-in slide-in-from-bottom-1 duration-200">
            <span className="text-muted-foreground shrink-0">
              [{formatTime(log.timestamp)}]
            </span>
            <span className={getLevelColor(log.level)}>
              {getLevelIcon(log.level)}
            </span>
            <span className={log.level === 'success' ? 'text-green-600' : 'text-foreground'}>
              {log.message}
            </span>
          </div>
        ))
      )}
      {isActive && (
        <div className="flex gap-2 items-center">
          <span className="text-muted-foreground shrink-0">
            [{formatTime(new Date())}]
          </span>
          <span className="text-muted-foreground animate-pulse">▊</span>
        </div>
      )}
    </div>
  )
}
