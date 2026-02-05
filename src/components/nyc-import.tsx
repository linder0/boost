'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { parseSSEStream, StatsGrid, LogDisplay, type StreamLog } from '@/components/ui/stream-display'
import {
  parseNYCOpenDataCSV,
  transformToEntities,
  getParseStats,
  filterByBorough,
  filterWithCoordinates,
  NYCRestaurant,
} from '@/lib/discovery/nyc-open-data'

type ImportStage = 'upload' | 'preview' | 'importing' | 'complete'

interface ImportProgress {
  batch: number
  totalBatches: number
  imported: number
  skipped: number
  errors: number
  percent: number
}

interface ImportResult {
  imported: number
  skipped: number
  errors: number
  message: string
}

const BOROUGHS = ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island']

export function NYCImport() {
  const [stage, setStage] = useState<ImportStage>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [restaurants, setRestaurants] = useState<NYCRestaurant[]>([])
  const [stats, setStats] = useState<ReturnType<typeof getParseStats> | null>(null)
  const [selectedBoroughs, setSelectedBoroughs] = useState<Set<string>>(new Set(BOROUGHS))
  const [requireCoordinates, setRequireCoordinates] = useState(true)
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<StreamLog[]>([])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setError(null)
    setLogs([])

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const parsed = parseNYCOpenDataCSV(text)
        setRestaurants(parsed)
        setStats(getParseStats(parsed))
        setStage('preview')
      } catch (err) {
        setError('Failed to parse CSV file. Make sure it\'s a valid NYC Open Data restaurant inspection file.')
        console.error(err)
      }
    }
    reader.readAsText(selectedFile)
  }, [])

  const toggleBorough = (borough: string) => {
    setSelectedBoroughs(prev => {
      const next = new Set(prev)
      if (next.has(borough)) {
        next.delete(borough)
      } else {
        next.add(borough)
      }
      return next
    })
  }

  const getFilteredRestaurants = useCallback(() => {
    let filtered = restaurants

    if (selectedBoroughs.size < BOROUGHS.length) {
      filtered = filterByBorough(filtered, Array.from(selectedBoroughs))
    }

    if (requireCoordinates) {
      filtered = filterWithCoordinates(filtered)
    }

    return filtered
  }, [restaurants, selectedBoroughs, requireCoordinates])

  const handleImport = async () => {
    const filtered = getFilteredRestaurants()
    if (filtered.length === 0) {
      setError('No restaurants to import with current filters')
      return
    }

    setStage('importing')
    setProgress(null)
    setResult(null)
    setError(null)
    setLogs([])

    try {
      const entities = transformToEntities(filtered)

      const response = await fetch('/api/import/nyc-restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurants: entities }),
      })

      if (!response.ok) throw new Error('Failed to start import')

      await parseSSEStream(response, {
        onEvent: (type, data: Record<string, unknown>) => {
          switch (type) {
            case 'log':
              setLogs(prev => [...prev, { message: data.message as string }])
              break
            case 'progress':
              setProgress({
                batch: data.batch as number,
                totalBatches: data.totalBatches as number,
                imported: data.imported as number,
                skipped: data.skipped as number,
                errors: data.errors as number,
                percent: data.percent as number,
              })
              break
            case 'batch_error':
              setLogs(prev => [...prev, { message: `Batch ${data.batch} error: ${data.error}` }])
              break
          }
        },
        onComplete: (data: Record<string, unknown>) => {
          setResult({
            imported: data.imported as number,
            skipped: data.skipped as number,
            errors: data.errors as number,
            message: data.message as string,
          })
          setStage('complete')
        },
        onError: (msg) => {
          setError(msg)
          setStage('preview')
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
      setStage('preview')
    }
  }

  const reset = () => {
    setStage('upload')
    setFile(null)
    setRestaurants([])
    setStats(null)
    setSelectedBoroughs(new Set(BOROUGHS))
    setRequireCoordinates(true)
    setProgress(null)
    setResult(null)
    setError(null)
    setLogs([])
  }

  const filteredCount = getFilteredRestaurants().length

  return (
    <Card className="mx-auto w-full max-w-4xl">
      <CardHeader>
        <CardTitle>NYC Restaurant Bulk Import</CardTitle>
        <CardDescription>
          Import all NYC restaurants from DOHMH Restaurant Inspection Results
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Stage */}
        {stage === 'upload' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="csv-file">NYC Open Data CSV File</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
              />
              <p className="text-sm text-muted-foreground">
                Download from{' '}
                <a
                  href="https://data.cityofnewyork.us/Health/DOHMH-New-York-City-Restaurant-Inspection-Results/43nn-pn8j"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  NYC Open Data
                </a>
                {' '}(DOHMH Restaurant Inspection Results)
              </p>
            </div>
          </div>
        )}

        {/* Preview Stage */}
        {stage === 'preview' && stats && (
          <div className="space-y-6">
            <div className="rounded-lg bg-muted p-4">
              <h3 className="font-semibold mb-3">Parsed Data Summary</h3>
              <StatsGrid
                columns={4}
                stats={[
                  { label: 'Total Restaurants', value: stats.total },
                  { label: 'With Coordinates', value: stats.withCoordinates },
                  { label: 'With Phone', value: stats.withPhone },
                  { label: 'Cuisine Types', value: stats.cuisineTypes },
                ]}
              />
            </div>

            {/* Borough Filter */}
            <div className="space-y-3">
              <Label>Filter by Borough</Label>
              <div className="flex flex-wrap gap-4">
                {BOROUGHS.map(borough => (
                  <div key={borough} className="flex items-center space-x-2">
                    <Checkbox
                      id={borough}
                      checked={selectedBoroughs.has(borough)}
                      onCheckedChange={() => toggleBorough(borough)}
                    />
                    <label htmlFor={borough} className="text-sm cursor-pointer">
                      {borough}
                      <span className="text-muted-foreground ml-1">
                        ({(stats.byBorough[borough] || 0).toLocaleString()})
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Coordinates Filter */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="require-coords"
                checked={requireCoordinates}
                onCheckedChange={(checked) => setRequireCoordinates(checked === true)}
              />
              <label htmlFor="require-coords" className="text-sm cursor-pointer">
                Only import restaurants with map coordinates
              </label>
            </div>

            {/* Import Count */}
            <div className="rounded-lg border p-4">
              <div className="text-lg">
                <strong>{filteredCount.toLocaleString()}</strong> restaurants will be imported
              </div>
              {filteredCount !== stats.total && (
                <div className="text-sm text-muted-foreground">
                  ({(stats.total - filteredCount).toLocaleString()} filtered out)
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={handleImport} disabled={filteredCount === 0} className="flex-1">
                Import {filteredCount.toLocaleString()} Restaurants
              </Button>
              <Button variant="outline" onClick={reset}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Importing Stage */}
        {stage === 'importing' && (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="font-semibold text-lg mb-2">Importing Restaurants...</h3>
              <p className="text-muted-foreground">This may take a few minutes for large datasets</p>
            </div>

            {progress && (
              <div className="space-y-2">
                <Progress value={progress.percent} />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Batch {progress.batch} of {progress.totalBatches}</span>
                  <span>{progress.percent}%</span>
                </div>
                <StatsGrid
                  columns={3}
                  stats={[
                    { label: 'Imported', value: progress.imported, color: 'success' },
                    { label: 'Skipped', value: progress.skipped, color: 'warning' },
                    { label: 'Errors', value: progress.errors, color: 'error' },
                  ]}
                />
              </div>
            )}

            <LogDisplay logs={logs} maxHeight="128px" />
          </div>
        )}

        {/* Complete Stage */}
        {stage === 'complete' && result && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-4xl mb-2">✓</div>
              <h3 className="font-semibold text-lg text-green-600">Import Complete</h3>
              <p className="text-muted-foreground">{result.message}</p>
            </div>

            <StatsGrid
              columns={3}
              stats={[
                { label: 'Imported', value: result.imported, color: 'success' },
                { label: 'Already Existed', value: result.skipped, color: 'warning' },
                { label: 'Errors', value: result.errors, color: 'error' },
              ]}
            />

            <div className="flex gap-2">
              <Button onClick={() => window.location.href = '/'} className="flex-1">
                View All Vendors
              </Button>
              <Button variant="outline" onClick={reset}>
                Import More
              </Button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
