'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

const SAMPLE_PROMPT = `Help me create a personal profile for an AI assistant that will send outreach emails to event venues on my behalf. Please ask me about:

1. My name and job title
2. My company/organization and what we do
3. The types of events I typically plan
4. My preferred communication tone (formal, casual, friendly, etc.)
5. Any specific phrases or information I always want included
6. How I like to sign off emails

Then compile my answers into a concise profile summary I can paste into the tool.`

export function CopyPrompt() {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(SAMPLE_PROMPT)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <details className="mb-6 text-sm">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
        Need help? Copy this prompt to ChatGPT to generate your profile
      </summary>
      <div className="relative mt-3">
        <pre className="p-4 pr-12 bg-muted rounded-lg overflow-x-auto whitespace-pre-wrap text-xs">
          {SAMPLE_PROMPT}
        </pre>
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-muted-foreground/10 text-muted-foreground hover:text-foreground transition-colors"
          title="Copy to clipboard"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>
    </details>
  )
}
