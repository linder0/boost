'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { MessageCircle, Send, Loader2, Trash2 } from 'lucide-react'
import { addChatMessage, clearChatHistory, type Event } from '@/app/actions/events'
import ReactMarkdown from 'react-markdown'

interface TabChatProps {
  event: Event
}

export function TabChat({ event }: TabChatProps) {
  const [messages, setMessages] = useState(event.chat_history || [])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [clearing, setClearing] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return

    setInput('')
    setSending(true)

    // Add user message optimistically
    const userMessage = { role: 'user' as const, content: text, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, userMessage])

    try {
      // Save user message
      await addChatMessage(event.id, { role: 'user', content: text })

      // Call AI for response
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          message: text,
          history: [...messages, userMessage],
          context: {
            eventName: event.name,
            date: event.date,
            headcount: event.headcount,
            budget: event.total_budget,
            city: event.city,
          },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const assistantMessage = {
          role: 'assistant' as const,
          content: data.message,
          created_at: new Date().toISOString(),
        }
        setMessages(prev => [...prev, assistantMessage])
        await addChatMessage(event.id, { role: 'assistant', content: data.message })
      } else {
        // If no AI endpoint, just acknowledge
        const assistantMessage = {
          role: 'assistant' as const,
          content: 'Chat AI is not configured yet. To enable, add an `/api/chat` endpoint with your preferred LLM.',
          created_at: new Date().toISOString(),
        }
        setMessages(prev => [...prev, assistantMessage])
        await addChatMessage(event.id, { role: 'assistant', content: assistantMessage.content })
      }
    } catch (error) {
      console.error('Chat error:', error)
    } finally {
      setSending(false)
    }
  }

  const handleClear = async () => {
    setClearing(true)
    try {
      await clearChatHistory(event.id)
      setMessages([])
    } finally {
      setClearing(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-240px)] max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Event Chat
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Brainstorm, draft invites, and coordinate
          </p>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClear} disabled={clearing}>
            <Trash2 className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <MessageCircle className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Start a conversation to brainstorm ideas, draft invite copy, or plan logistics
              </p>
            </CardContent>
          </Card>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert [&_p]:my-1">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))
        )}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-xl px-4 py-2.5">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about planning this event..."
          rows={2}
          className="resize-none"
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="self-end"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
