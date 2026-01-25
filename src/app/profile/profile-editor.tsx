'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { saveUserProfile } from '@/app/actions/profile'

interface ProfileEditorProps {
  initialContext: string
}

const PLACEHOLDER_TEXT = `Tell the AI about yourself and your preferences:

• Your name and role (e.g., "I'm Sarah, an event coordinator at TechCorp")
• Company/organization name and what you do
• Communication style preferences (formal, casual, friendly, professional)
• Any specific instructions for outreach messages
• How you'd like to sign off emails
• Common event types you plan
• Any other context that would help personalize your outreach

Example:
"I'm Alex Chen, Events Manager at Startup Hub. We host tech meetups and networking events in the Bay Area. I prefer a friendly but professional tone. Always mention that we're a community-focused organization. Sign emails as 'Alex Chen, Events Team'"`

export function ProfileEditor({ initialContext }: ProfileEditorProps) {
  const [context, setContext] = useState(initialContext)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await saveUserProfile(context)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Failed to save profile:', error)
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = context !== initialContext

  return (
    <div className="space-y-4">
      <Textarea
        value={context}
        onChange={(e) => setContext(e.target.value)}
        placeholder={PLACEHOLDER_TEXT}
        className="min-h-[400px] font-mono text-sm"
      />
      <div className="flex items-center gap-4">
        <Button 
          onClick={handleSave} 
          disabled={saving || !hasChanges}
        >
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </Button>
        {hasChanges && !saving && (
          <span className="text-sm text-muted-foreground">You have unsaved changes</span>
        )}
      </div>
    </div>
  )
}
