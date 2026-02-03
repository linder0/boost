'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface PillButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  size?: 'sm' | 'md'
}

export const PillButton = forwardRef<HTMLButtonElement, PillButtonProps>(
  ({ className, selected = false, size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'inline-flex items-center gap-1 rounded-full font-medium transition-colors cursor-pointer',
          size === 'sm' && 'px-2.5 py-1 text-xs',
          size === 'md' && 'px-3 py-1.5 text-sm',
          selected
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground hover:bg-muted/80',
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)

PillButton.displayName = 'PillButton'
