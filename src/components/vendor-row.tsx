'use client'

import { ReactNode } from 'react'
import { Check, LucideIcon } from 'lucide-react'
import { Input } from './ui/input'
import { PillButton } from './ui/pill-button'

export type VendorRowState = 'need' | 'have' | 'none'

interface VendorRowProps {
  icon: LucideIcon
  label: string
  state: VendorRowState
  onStateChange: (state: VendorRowState) => void
  notes: string
  onNotesChange: (notes: string) => void
  placeholder?: string
  havePlaceholder?: string
  children?: ReactNode
}

export function VendorRow({
  icon: Icon,
  label,
  state,
  onStateChange,
  notes,
  onNotesChange,
  placeholder = 'Add details...',
  havePlaceholder,
  children,
}: VendorRowProps) {
  const isExpanded = state !== 'none'
  const activePlaceholder = state === 'have' 
    ? (havePlaceholder || `Details about your ${label.toLowerCase()}...`)
    : placeholder

  const handleNeedClick = () => {
    onStateChange(state === 'need' ? 'none' : 'need')
  }

  const handleHaveClick = () => {
    onStateChange(state === 'have' ? 'none' : 'have')
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="p-4 flex items-center gap-4">
        <div className="rounded-lg p-2.5 bg-muted">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium">{label}</p>
        </div>
        <div className="flex gap-2">
          <PillButton selected={state === 'need'} onClick={handleNeedClick}>
            Need
          </PillButton>
          <PillButton selected={state === 'have'} onClick={handleHaveClick}>
            Have
          </PillButton>
        </div>
      </div>
      
      {/* Expandable content */}
      <div className={`grid transition-all duration-200 ease-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-0 space-y-3">
            <Input
              placeholder={activePlaceholder}
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              className="bg-background"
            />
            {state === 'need' && children}
          </div>
        </div>
      </div>
    </div>
  )
}

// Pill options component for venue types, indoor/outdoor, etc.
interface PillOptionsProps<T extends string> {
  options: { value: T; label: string }[]
  selected: T | T[]
  onChange: (value: T) => void
  multi?: boolean
}

export function PillOptions<T extends string>({
  options,
  selected,
  onChange,
  multi = false,
}: PillOptionsProps<T>) {
  const isSelected = (value: T) => 
    multi 
      ? (selected as T[]).includes(value) 
      : selected === value

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <PillButton
          key={option.value}
          size="sm"
          selected={isSelected(option.value)}
          onClick={() => onChange(option.value)}
        >
          {isSelected(option.value) && <Check className="h-2.5 w-2.5" />}
          {option.label}
        </PillButton>
      ))}
    </div>
  )
}
