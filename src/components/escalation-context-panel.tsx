'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Textarea } from './ui/textarea'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion'
import { 
  VendorThread, 
  ParsedResponse, 
  AutomationStep,
  SuggestedAction,
  EscalationCategory,
} from '@/types/database'
import { formatDistanceToNow, format } from 'date-fns'

// ============================================================================
// Types
// ============================================================================

interface EscalationContextPanelProps {
  thread: VendorThread
  parsedResponse?: ParsedResponse | null
  vendorName: string
  onSendResponse: (message: string) => Promise<void>
  onApprove?: () => Promise<void>
  onReject?: () => Promise<void>
  loading?: boolean
}

// ============================================================================
// Helper Functions
// ============================================================================

function getEscalationCategoryLabel(category: EscalationCategory | null): string {
  switch (category) {
    case 'low_confidence':
      return 'Low Confidence Parse'
    case 'vendor_questions':
      return 'Vendor Asked Questions'
    case 'missing_info':
      return 'Missing Information'
    case 'budget_edge':
      return 'Budget Edge Case'
    case 'custom':
      return 'Custom Escalation'
    default:
      return 'Manual Review Required'
  }
}

function getEscalationCategoryDescription(category: EscalationCategory | null): string {
  switch (category) {
    case 'low_confidence':
      return 'The AI was not confident in parsing the vendor response. Please review the original message.'
    case 'vendor_questions':
      return 'The vendor asked questions that need your input before automation can continue.'
    case 'missing_info':
      return 'Critical information (pricing or availability) is missing from the vendor response.'
    case 'budget_edge':
      return 'The quote is close to your budget limit. Please decide how to proceed.'
    case 'custom':
      return 'This escalation was triggered manually or by a custom rule.'
    default:
      return 'This thread requires your attention before automation can continue.'
  }
}

function getAutomationStepIcon(type: string): string {
  switch (type) {
    case 'OUTREACH':
      return '📤'
    case 'REPLY':
      return '📥'
    case 'PARSE':
      return '🔍'
    case 'DECISION':
      return '⚖️'
    case 'ESCALATION':
      return '🚨'
    case 'FOLLOW_UP':
      return '🔄'
    case 'APPROVAL':
      return '✅'
    case 'HUMAN_RESPONSE':
      return '👤'
    default:
      return '•'
  }
}

// ============================================================================
// Component
// ============================================================================

export function EscalationContextPanel({
  thread,
  parsedResponse,
  vendorName,
  onSendResponse,
  onApprove,
  onReject,
  loading = false,
}: EscalationContextPanelProps) {
  const [customMessage, setCustomMessage] = useState('')
  const [selectedAction, setSelectedAction] = useState<SuggestedAction | null>(null)

  const suggestedActions = thread.decision 
    ? (parsedResponse?.raw_data?.suggestedActions as SuggestedAction[] || [])
    : []

  const automationHistory = thread.automation_history || []

  const handleSendResponse = async () => {
    const messageToSend = selectedAction?.draftMessage || customMessage
    if (!messageToSend.trim()) return
    
    await onSendResponse(messageToSend)
    setCustomMessage('')
    setSelectedAction(null)
  }

  return (
    <div className="space-y-4">
      {/* Escalation Banner */}
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🚨</span>
              <CardTitle className="text-base text-amber-800 dark:text-amber-200">
                Action Required
              </CardTitle>
            </div>
            <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300">
              {getEscalationCategoryLabel(thread.escalation_category)}
            </Badge>
          </div>
          <CardDescription className="text-amber-700 dark:text-amber-300">
            {getEscalationCategoryDescription(thread.escalation_category)}
          </CardDescription>
        </CardHeader>
        {thread.escalation_reason && (
          <CardContent className="pt-0">
            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
              {thread.escalation_reason}
            </p>
          </CardContent>
        )}
      </Card>

      {/* Parsed Facts */}
      {parsedResponse && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Parsed Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Availability */}
            {parsedResponse.availability && parsedResponse.availability.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Availability</p>
                <div className="flex flex-wrap gap-1">
                  {parsedResponse.availability.map((a, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {a.date} {a.time && `@ ${a.time}`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Quote */}
            {parsedResponse.quote && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Quote</p>
                <p className="text-lg font-semibold">
                  ${parsedResponse.quote.amount.toLocaleString()}
                </p>
                {parsedResponse.quote.breakdown && parsedResponse.quote.breakdown.length > 0 && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {parsedResponse.quote.breakdown.map((item, i) => (
                      <span key={i}>
                        {item.item}: ${item.amount}
                        {i < parsedResponse.quote!.breakdown.length - 1 && ' • '}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Questions from Vendor */}
            {parsedResponse.questions && parsedResponse.questions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Questions from Vendor
                </p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {parsedResponse.questions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Inclusions */}
            {parsedResponse.inclusions && parsedResponse.inclusions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Inclusions</p>
                <div className="flex flex-wrap gap-1">
                  {parsedResponse.inclusions.map((inc, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {inc}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Confidence & Sentiment */}
            <div className="flex gap-4 pt-2 border-t">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Confidence</p>
                <Badge 
                  variant={parsedResponse.confidence === 'HIGH' ? 'default' : 'secondary'}
                  className="mt-1"
                >
                  {parsedResponse.confidence}
                </Badge>
              </div>
              {parsedResponse.sentiment && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Sentiment</p>
                  <Badge variant="outline" className="mt-1 capitalize">
                    {parsedResponse.sentiment}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggested Actions */}
      {suggestedActions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Suggested Actions</CardTitle>
            <CardDescription>
              AI-generated responses based on the vendor's message
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {suggestedActions.map((action, i) => (
              <div
                key={i}
                className={`p-3 rounded-md border cursor-pointer transition-colors ${
                  selectedAction === action 
                    ? 'border-primary bg-primary/5' 
                    : 'hover:bg-muted'
                }`}
                onClick={() => setSelectedAction(action === selectedAction ? null : action)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{action.label}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">
                      {action.type}
                    </Badge>
                    <Badge 
                      variant={action.confidence >= 80 ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {action.confidence}% confidence
                    </Badge>
                  </div>
                </div>
                {action.draftMessage && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {action.draftMessage}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Response Input */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            {selectedAction ? 'Review & Send Response' : 'Write Your Response'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={selectedAction?.draftMessage || customMessage}
            onChange={(e) => {
              if (selectedAction) {
                // If editing a suggested action, clear it and use custom
                setSelectedAction(null)
              }
              setCustomMessage(e.target.value)
            }}
            placeholder={`Write your response to ${vendorName}...`}
            rows={6}
            className="font-mono text-sm"
          />
          <div className="flex gap-2">
            <Button
              onClick={handleSendResponse}
              disabled={loading || (!customMessage.trim() && !selectedAction?.draftMessage)}
              className="flex-1"
            >
              {loading ? 'Sending...' : 'Send Response & Resume Automation'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {(onApprove || onReject) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            {onApprove && (
              <Button
                variant="outline"
                onClick={onApprove}
                disabled={loading}
                className="flex-1 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-950"
              >
                Mark as Viable
              </Button>
            )}
            {onReject && (
              <Button
                variant="outline"
                onClick={onReject}
                disabled={loading}
                className="flex-1 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-950"
              >
                Reject Vendor
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Automation History */}
      {automationHistory.length > 0 && (
        <Accordion type="single" collapsible>
          <AccordionItem value="history" className="border rounded-md px-4">
            <AccordionTrigger className="py-3 text-sm">
              Automation History ({automationHistory.length} steps)
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pb-2">
                {automationHistory.map((step, i) => (
                  <div 
                    key={i} 
                    className="flex items-start gap-2 text-sm"
                  >
                    <span className="shrink-0">{getAutomationStepIcon(step.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{step.type.replace('_', ' ')}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(step.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                      {step.details && Object.keys(step.details).length > 0 && (
                        <p className="text-xs text-muted-foreground truncate">
                          {JSON.stringify(step.details)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  )
}
