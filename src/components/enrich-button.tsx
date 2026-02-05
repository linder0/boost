'use client'

import { useState } from 'react'
import { Button } from './ui/button'
import { Loader2, Sparkles, Search, Check, X } from 'lucide-react'
import { enrichEntity } from '@/app/actions/entities'

interface EnrichButtonProps {
  entityId: string
  /** Variant: 'icon' for inline field buttons, 'button' for row actions */
  variant?: 'icon' | 'button'
  /** Label for button variant */
  label?: string
  /** Callback when enrichment completes */
  onEnriched?: (result: {
    success: boolean
    enrichedFields?: {
      website?: string
      phone?: string
      rating?: number
      priceLevel?: number
      googlePlaceId?: string
    }
  }) => void
  /** Whether the entity is already enriched (has Google Place ID) */
  isEnriched?: boolean
  /** Size for icon variant */
  size?: 'sm' | 'default'
}

export function EnrichButton({
  entityId,
  variant = 'icon',
  label = 'Enrich',
  onEnriched,
  isEnriched = false,
  size = 'sm',
}: EnrichButtonProps) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleEnrich = async (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent row click

    if (loading || isEnriched) return

    setLoading(true)
    setStatus('idle')

    try {
      const result = await enrichEntity(entityId)

      if (result.success) {
        setStatus('success')
        onEnriched?.({
          success: true,
          enrichedFields: result.enrichedFields,
        })
      } else {
        setStatus('error')
        onEnriched?.({ success: false })
      }
    } catch (err) {
      console.error('Enrichment failed:', err)
      setStatus('error')
      onEnriched?.({ success: false })
    } finally {
      setLoading(false)
      // Reset status after 2 seconds
      setTimeout(() => setStatus('idle'), 2000)
    }
  }

  if (isEnriched && variant === 'icon') {
    return null // Don't show icon for already enriched
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={handleEnrich}
        disabled={loading}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
        title="Find missing data from Google Places"
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : status === 'success' ? (
          <Check className="h-3 w-3 text-green-500" />
        ) : status === 'error' ? (
          <X className="h-3 w-3 text-red-500" />
        ) : (
          <Search className="h-3 w-3" />
        )}
        <span>Find</span>
      </button>
    )
  }

  // Button variant
  return (
    <Button
      onClick={handleEnrich}
      disabled={loading || isEnriched}
      variant={isEnriched ? 'ghost' : 'outline'}
      size={size}
      className="gap-1"
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : isEnriched ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : status === 'success' ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : status === 'error' ? (
        <X className="h-3 w-3 text-red-500" />
      ) : (
        <Sparkles className="h-3 w-3" />
      )}
      {isEnriched ? 'Enriched' : loading ? 'Enriching...' : label}
    </Button>
  )
}

/**
 * Inline "Find" link for empty field values
 */
interface FindLinkProps {
  entityId: string
  onEnriched?: () => void
}

export function FindLink({ entityId, onEnriched }: FindLinkProps) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleFind = async (e: React.MouseEvent) => {
    e.stopPropagation()

    if (loading) return

    setLoading(true)
    setStatus('idle')

    try {
      const result = await enrichEntity(entityId)

      if (result.success) {
        setStatus('success')
        onEnriched?.()
      } else {
        setStatus('error')
      }
    } catch (err) {
      console.error('Enrichment failed:', err)
      setStatus('error')
    } finally {
      setLoading(false)
      setTimeout(() => setStatus('idle'), 2000)
    }
  }

  return (
    <button
      onClick={handleFind}
      disabled={loading}
      className="inline-flex items-center gap-0.5 text-xs text-blue-500 hover:text-blue-600 hover:underline transition-colors disabled:opacity-50"
      title="Find from Google Places"
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : status === 'success' ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : status === 'error' ? (
        <span className="text-red-500">Not found</span>
      ) : (
        <>
          <Search className="h-3 w-3" />
          <span>Find</span>
        </>
      )}
    </button>
  )
}
