'use client'

import { useState } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from './ui/drawer'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion'
import { MessageTimeline } from './message-timeline'
import { ParsedFactsCard } from './parsed-facts-card'
import { VendorWithThread, MessageWithParsed } from '@/types/database'
import { escalateThread } from '@/app/actions/threads'
import { normalizeJoinResult } from '@/lib/utils'

interface VendorDrawerProps {
  vendor: VendorWithThread | null
  messages: MessageWithParsed[]
  onClose: () => void
}

export function VendorDrawer({ vendor, messages, onClose }: VendorDrawerProps) {
  const [escalationMessage, setEscalationMessage] = useState('')
  const [loading, setLoading] = useState(false)

  if (!vendor) return null

  const thread = normalizeJoinResult(vendor.vendor_threads)

  const isEscalation = thread?.status === 'ESCALATION'

  // Get the most recent parsed response
  const latestParsedMessage = messages
    .filter((m) => m.parsed_responses)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]

  const handleEscalate = async () => {
    if (!thread || !escalationMessage.trim()) return

    setLoading(true)
    try {
      await escalateThread(thread.id, escalationMessage)
      setEscalationMessage('')
      onClose()
    } catch (error) {
      console.error('Failed to escalate:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Drawer open={!!vendor} onOpenChange={onClose}>
      <DrawerContent className="h-[90vh]">
        <div className="mx-auto w-full max-w-4xl overflow-y-auto p-6">
          <DrawerHeader>
            <DrawerTitle className="flex items-center justify-between">
              <span>{vendor.name}</span>
              {thread && (
                <Badge
                  variant={
                    thread.status === 'VIABLE'
                      ? 'default'
                      : thread.status === 'ESCALATION'
                      ? 'destructive'
                      : 'secondary'
                  }
                >
                  {thread.status}
                </Badge>
              )}
            </DrawerTitle>
            <DrawerDescription>
              {vendor.category} • {vendor.contact_email}
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-6">
            {/* Escalation Banner */}
            {isEscalation && thread?.escalation_reason && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-4">
                <h3 className="font-semibold text-destructive">
                  Action Required
                </h3>
                <p className="mt-1 text-sm text-destructive/80">
                  {thread.escalation_reason}
                </p>
              </div>
            )}

            {/* Message Timeline */}
            <div>
              <h3 className="mb-4 text-lg font-semibold">Message Thread</h3>
              <MessageTimeline messages={messages} />
            </div>

            {/* Parsed Facts Panel */}
            {latestParsedMessage?.parsed_responses && (
              <ParsedFactsCard parsed={latestParsedMessage.parsed_responses} />
            )}

            {/* System Reasoning */}
            {thread?.reason && (
              <Accordion type="single" collapsible>
                <AccordionItem value="reasoning">
                  <AccordionTrigger>System Reasoning</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-semibold">Decision: </span>
                        {thread.decision || 'Not decided'}
                      </div>
                      <div>
                        <span className="font-semibold">Reason: </span>
                        {thread.reason}
                      </div>
                      {thread.confidence && (
                        <div>
                          <span className="font-semibold">Confidence: </span>
                          {thread.confidence}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}

            {/* Escalation Prompt */}
            {isEscalation && (
              <div className="space-y-4 rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold">Send Response & Resume Automation</h3>
                <Textarea
                  placeholder="Type your response to the vendor..."
                  value={escalationMessage}
                  onChange={(e) => setEscalationMessage(e.target.value)}
                  rows={4}
                />
                <Button
                  onClick={handleEscalate}
                  disabled={loading || !escalationMessage.trim()}
                  className="w-full"
                >
                  {loading ? 'Sending...' : 'Send & Resume Automation'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
