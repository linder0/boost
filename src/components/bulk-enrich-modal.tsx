'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Sparkles, Loader2, Check, X } from 'lucide-react'
import { parseSSEStream, StatsGrid, LogDisplay, type StreamLog } from '@/components/ui/stream-display'

interface EnrichmentStats {
  total: number
  enriched: number
  attempted: number
  pending: number
}

interface EnrichmentProgress {
  enriched: number
  failed: number
  percent: number
  processed: number
  total: number
}

type EnrichmentStage = 'idle' | 'loading_stats' | 'ready' | 'enriching' | 'complete'

interface BulkEnrichModalProps {
  onComplete?: () => void
}

export function BulkEnrichModal({ onComplete }: BulkEnrichModalProps) {
  const [open, setOpen] = useState(false)
  const [stage, setStage] = useState<EnrichmentStage>('idle')
  const [stats, setStats] = useState<EnrichmentStats | null>(null)
  const [progress, setProgress] = useState<EnrichmentProgress | null>(null)
  const [result, setResult] = useState<{ enriched: number; failed: number; message: string } | null>(null)
  const [logs, setLogs] = useState<StreamLog[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && stage === 'idle') {
      loadStats()
    }
  }, [open, stage])

  const loadStats = async () => {
    setStage('loading_stats')
    setError(null)

    try {
      const response = await fetch('/api/enrich/bulk')
      if (!response.ok) throw new Error('Failed to load stats')
      setStats(await response.json())
      setStage('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats')
      setStage('idle')
    }
  }

  const startEnrichment = useCallback(async () => {
    setStage('enriching')
    setProgress(null)
    setResult(null)
    setLogs([])
    setError(null)

    try {
      const response = await fetch('/api/enrich/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 1000 }),
      })

      if (!response.ok) throw new Error('Failed to start enrichment')

      await parseSSEStream(response, {
        onEvent: (type, data: Record<string, unknown>) => {
          switch (type) {
            case 'log':
            case 'start':
              setLogs(prev => [...prev.slice(-19), { message: data.message as string }])
              break
            case 'progress':
              setProgress({
                enriched: data.enriched as number,
                failed: data.failed as number,
                percent: data.percent as number,
                processed: data.processed as number,
                total: data.total as number,
              })
              break
            case 'enriched':
              setLogs(prev => [...prev.slice(-19), { message: `✓ ${data.name}` }])
              break
            case 'not_found':
              setLogs(prev => [...prev.slice(-19), { message: `✗ ${data.name} (not found)` }])
              break
            case 'error_item':
              setLogs(prev => [...prev.slice(-19), { message: `⚠ ${data.name}: ${data.error}` }])
              break
          }
        },
        onComplete: (data: Record<string, unknown>) => {
          setResult({
            enriched: data.enriched as number,
            failed: data.failed as number,
            message: data.message as string,
          })
          setStage('complete')
          onComplete?.()
        },
        onError: (msg) => {
          setError(msg)
          setStage('ready')
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrichment failed')
      setStage('ready')
    }
  }, [onComplete])

  const handleClose = () => {
    if (stage !== 'enriching') {
      setOpen(false)
      setTimeout(() => {
        setStage('idle')
        setStats(null)
        setProgress(null)
        setResult(null)
        setLogs([])
        setError(null)
      }, 200)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Sparkles className="h-4 w-4" />
          Enrich All
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md" onInteractOutside={(e) => stage === 'enriching' && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Bulk Enrichment</DialogTitle>
          <DialogDescription>
            Enrich all restaurants with Google Places data (website, phone, rating)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {stage === 'loading_stats' && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {stage === 'ready' && stats && (
            <div className="space-y-4">
              <StatsGrid
                columns={2}
                stats={[
                  { label: 'Pending', value: stats.pending },
                  { label: 'Enriched', value: stats.enriched, color: 'success' },
                ]}
              />

              {stats.pending > 0 ? (
                <Button onClick={startEnrichment} className="w-full gap-1">
                  <Sparkles className="h-4 w-4" />
                  Enrich {Math.min(stats.pending, 1000).toLocaleString()} Restaurants
                </Button>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  All restaurants are already enriched!
                </div>
              )}

              {stats.attempted > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  {stats.attempted.toLocaleString()} restaurants were attempted but not found
                </p>
              )}
            </div>
          )}

          {stage === 'enriching' && (
            <div className="space-y-4">
              {progress && (
                <>
                  <Progress value={progress.percent} />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{progress.processed} / {progress.total}</span>
                    <span>{progress.percent}%</span>
                  </div>
                  <StatsGrid
                    columns={2}
                    stats={[
                      { label: 'Enriched', value: progress.enriched, color: 'success' },
                      { label: 'Not Found', value: progress.failed, color: 'warning' },
                    ]}
                  />
                </>
              )}
              <LogDisplay logs={logs} maxHeight="128px" />
              <p className="text-xs text-muted-foreground text-center">
                Please keep this window open until enrichment completes
              </p>
            </div>
          )}

          {stage === 'complete' && result && (
            <div className="space-y-4">
              <div className="text-center">
                <Check className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <h3 className="font-semibold text-lg">Enrichment Complete</h3>
                <p className="text-muted-foreground">{result.message}</p>
              </div>
              <StatsGrid
                columns={2}
                stats={[
                  { label: 'Enriched', value: result.enriched, color: 'success' },
                  { label: 'Not Found', value: result.failed, color: 'warning' },
                ]}
              />
              <Button onClick={handleClose} className="w-full">Done</Button>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
              <X className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
