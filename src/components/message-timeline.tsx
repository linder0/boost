'use client'

import { MessageWithParsed } from '@/types/database'
import { format } from 'date-fns'
import { Badge } from './ui/badge'

interface MessageTimelineProps {
  messages: MessageWithParsed[]
}

export function MessageTimeline({ messages }: MessageTimelineProps) {
  if (messages.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No messages yet
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => {
        const isVendor = message.sender === 'VENDOR'
        const isSystem = message.sender === 'SYSTEM'

        return (
          <div
            key={message.id}
            className={`flex ${isVendor ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                isVendor
                  ? 'bg-muted'
                  : isSystem
                  ? 'bg-secondary border border-border'
                  : 'bg-accent border border-border'
              }`}
            >
              <div className="mb-2 flex items-center gap-2">
                <Badge variant={isVendor ? 'outline' : 'default'} className="text-xs">
                  {message.sender}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(message.created_at), 'MMM d, h:mm a')}
                </span>
                {message.inbound && (
                  <Badge variant="secondary" className="text-xs">
                    Inbound
                  </Badge>
                )}
              </div>
              <div className="whitespace-pre-wrap text-sm">{message.body}</div>
              {message.parsed_responses && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Parsed with {message.parsed_responses.confidence} confidence
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
