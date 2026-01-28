'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserProfile, AccountType } from '@/types/database'
import { saveUserProfile, saveAutomationSettings } from '@/app/actions/profile'
import { CheckCircle2, XCircle, Building2, User } from 'lucide-react'

interface GmailStatusProps {
  isConnected: boolean
  email?: string
}

export function GmailStatus({ isConnected, email }: GmailStatusProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center gap-3">
        {isConnected ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <XCircle className="h-5 w-5 text-muted-foreground" />
        )}
        <div>
          <p className="font-medium">Gmail Integration</p>
          <p className="text-sm text-muted-foreground">
            {isConnected
              ? `Connected${email ? ` as ${email}` : ''}`
              : 'Not connected - sign out and sign back in with Google'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isConnected ? (
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
            Active
          </span>
        ) : (
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            Inactive
          </span>
        )}
      </div>
    </div>
  )
}

interface AccountTypeSelectorProps {
  currentType: AccountType
}

export function AccountTypeSelector({ currentType }: AccountTypeSelectorProps) {
  const [accountType, setAccountType] = useState<AccountType>(currentType)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleChange = async (type: AccountType) => {
    setAccountType(type)
    setSaving(true)
    setSaved(false)
    try {
      await saveUserProfile({ account_type: type })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Failed to update account type:', error)
      setAccountType(currentType) // Revert on error
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div>
        <p className="font-medium">Account Type</p>
        <p className="text-sm text-muted-foreground">
          Choose whether this is a personal or company account
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg border p-1">
          <button
            onClick={() => handleChange('personal')}
            disabled={saving}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              accountType === 'personal'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <User className="h-4 w-4" />
            Personal
          </button>
          <button
            onClick={() => handleChange('company')}
            disabled={saving}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              accountType === 'company'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building2 className="h-4 w-4" />
            Company
          </button>
        </div>
        {saved && (
          <span className="text-sm text-green-600">Saved!</span>
        )}
      </div>
    </div>
  )
}

interface AutomationSettingsProps {
  profile: UserProfile | null
}

export function AutomationSettings({ profile }: AutomationSettingsProps) {
  const [followUpDays, setFollowUpDays] = useState(profile?.follow_up_days ?? 3)
  const [maxFollowUps, setMaxFollowUps] = useState(profile?.max_follow_ups ?? 2)
  const [autoReject, setAutoReject] = useState(profile?.auto_reject_over_budget ?? false)
  const [autoRespond, setAutoRespond] = useState(profile?.auto_respond_viable ?? false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await saveAutomationSettings({
        follow_up_days: followUpDays,
        max_follow_ups: maxFollowUps,
        auto_reject_over_budget: autoReject,
        auto_respond_viable: autoRespond,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Failed to save automation settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const hasChanges =
    followUpDays !== (profile?.follow_up_days ?? 3) ||
    maxFollowUps !== (profile?.max_follow_ups ?? 2) ||
    autoReject !== (profile?.auto_reject_over_budget ?? false) ||
    autoRespond !== (profile?.auto_respond_viable ?? false)

  return (
    <div className="space-y-6">
      {/* Follow-up Timing */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Follow-up Timing</Label>
          <span className="text-sm text-muted-foreground">{followUpDays} days</span>
        </div>
        <Slider
          value={[followUpDays]}
          onValueChange={([value]) => setFollowUpDays(value)}
          min={1}
          max={14}
          step={1}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          Wait this many days before sending a follow-up email to vendors who haven&apos;t responded
        </p>
      </div>

      {/* Max Follow-ups */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Maximum Follow-ups</Label>
          <span className="text-sm text-muted-foreground">{maxFollowUps}</span>
        </div>
        <Slider
          value={[maxFollowUps]}
          onValueChange={([value]) => setMaxFollowUps(value)}
          min={0}
          max={5}
          step={1}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          Maximum number of follow-up emails to send per vendor (0 = no follow-ups)
        </p>
      </div>

      {/* Auto-decision toggles */}
      <div className="space-y-4 pt-2">
        <div className="flex items-start gap-3">
          <Checkbox
            id="auto-reject"
            checked={autoReject}
            onCheckedChange={(checked) => setAutoReject(!!checked)}
          />
          <div className="space-y-1">
            <Label htmlFor="auto-reject" className="cursor-pointer">
              Auto-reject over-budget quotes
            </Label>
            <p className="text-xs text-muted-foreground">
              Automatically send rejection emails to vendors who quote more than 15% over your budget
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Checkbox
            id="auto-respond"
            checked={autoRespond}
            onCheckedChange={(checked) => setAutoRespond(!!checked)}
          />
          <div className="space-y-1">
            <Label htmlFor="auto-respond" className="cursor-pointer">
              Auto-respond to viable quotes
            </Label>
            <p className="text-xs text-muted-foreground">
              Automatically send acknowledgment emails to vendors with quotes within budget
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-4 pt-2">
        <Button onClick={handleSave} disabled={saving || !hasChanges}>
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </Button>
        {hasChanges && !saving && (
          <span className="text-sm text-muted-foreground">You have unsaved changes</span>
        )}
      </div>
    </div>
  )
}

interface CommunicationToneSelectorProps {
  currentTone: string
}

export function CommunicationToneSelector({ currentTone }: CommunicationToneSelectorProps) {
  const [tone, setTone] = useState(currentTone || 'professional')
  const [saving, setSaving] = useState(false)

  const handleChange = async (newTone: string) => {
    setTone(newTone)
    setSaving(true)
    try {
      await saveUserProfile({ communication_tone: newTone as any })
    } catch (error) {
      console.error('Failed to update tone:', error)
      setTone(currentTone)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div>
        <p className="font-medium">Communication Tone</p>
        <p className="text-sm text-muted-foreground">
          Set the default tone for AI-generated outreach messages
        </p>
      </div>
      <Select value={tone} onValueChange={handleChange} disabled={saving}>
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="professional">Professional</SelectItem>
          <SelectItem value="friendly">Friendly</SelectItem>
          <SelectItem value="casual">Casual</SelectItem>
          <SelectItem value="formal">Formal</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
