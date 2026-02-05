'use client'

import { useEffect, useRef, ReactNode, useState } from 'react'
import { Button } from '@/components/ui/button'
import { PillButton } from '@/components/ui/pill-button'
import { CUISINE_TYPES, NYC_NEIGHBORHOODS } from '@/lib/entities'
import { Search, RotateCcw, X, SlidersHorizontal, List } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { type LogEntry, formatTime, getLevelColor, getLevelIcon } from '@/lib/log-utils'

// Re-export LogEntry for consumers
export type { LogEntry }

// Discovery source configuration
export const DISCOVERY_SOURCES = [
  { id: 'google_places', label: 'Google', enabled: true, status: 'stable' as const },
  { id: 'exa', label: 'Exa', enabled: false, status: 'experimental' as const, note: 'Location finding issues' },
  { id: 'resy', label: 'Resy', enabled: false, status: 'requires_key' as const, note: 'Requires API key' },
  { id: 'opentable', label: 'OpenTable', enabled: false, status: 'experimental' as const, note: 'Unofficial API' },
  { id: 'beli', label: 'Beli', enabled: false, status: 'coming_soon' as const },
] as const

// Location mode options
export type LocationMode = 'neighborhoods' | 'radius' | 'map_area'

const LOCATION_MODES = [
  { id: 'neighborhoods' as const, label: 'Neighborhoods' },
  { id: 'map_area' as const, label: 'Map Area' },
] as const

// Radius options for location filter
const RADIUS_OPTIONS = [
  { id: '0.5', label: '0.5 mi' },
  { id: '1', label: '1 mi' },
  { id: '2', label: '2 mi' },
  { id: '5', label: '5 mi' },
] as const

// Party size range options (min: 0 means "any")
const PARTY_SIZE_OPTIONS = [
  { min: 0, max: null, label: 'Any' },
  { min: 1, max: 4, label: '1-4' },
  { min: 5, max: 8, label: '5-8' },
  { min: 9, max: 12, label: '9-12' },
  { min: 13, max: 20, label: '13-20' },
  { min: 21, max: 50, label: '21-50' },
  { min: 51, max: null, label: '50+' },
] as const

interface DiscoveryFiltersProps {
  // Filter state
  selectedSources: Set<string>
  onToggleSource: (sourceId: string) => void
  selectedCuisine: string | null
  onCuisineChange: (cuisine: string | null) => void
  // Party size state (range)
  partySizeMin: number
  partySizeMax: number | null
  onPartySizeChange: (min: number, max: number | null) => void
  // Location state
  locationMode: LocationMode
  onLocationModeChange: (mode: LocationMode) => void
  // Neighborhoods mode
  selectedNeighborhoods: string[]
  onNeighborhoodsChange: (neighborhoods: string[]) => void
  // Radius mode
  selectedRadius: string
  onRadiusChange: (radius: string) => void
  // Map area mode - uses current map bounds (handled by parent)
  // Log state
  logs: LogEntry[]
  isDiscovering: boolean
  hasDiscovered: boolean
  // Actions
  onSearch: () => void
  // Results summary
  resultCount?: number
}

interface DiscoveryMapCardProps {
  children: ReactNode
  isDiscovering?: boolean
}

/**
 * Flat filters section with toggle between Filters and Logs views
 */
export function DiscoveryFilters({
  selectedSources,
  onToggleSource,
  selectedCuisine,
  onCuisineChange,
  partySizeMin,
  partySizeMax,
  onPartySizeChange,
  locationMode,
  onLocationModeChange,
  selectedNeighborhoods,
  onNeighborhoodsChange,
  selectedRadius,
  onRadiusChange,
  logs,
  isDiscovering,
  hasDiscovered,
  onSearch,
  resultCount = 0,
}: DiscoveryFiltersProps) {
  const logScrollRef = useRef<HTMLDivElement>(null)
  const [activeView, setActiveView] = useState<'filters' | 'logs'>('filters')

  const handleAddNeighborhood = (neighborhood: string) => {
    if (!selectedNeighborhoods.includes(neighborhood)) {
      onNeighborhoodsChange([...selectedNeighborhoods, neighborhood])
    }
  }

  const handleRemoveNeighborhood = (neighborhood: string) => {
    onNeighborhoodsChange(selectedNeighborhoods.filter((n) => n !== neighborhood))
  }

  // Get available neighborhoods (not already selected)
  const availableNeighborhoods = NYC_NEIGHBORHOODS.filter(
    (n) => !selectedNeighborhoods.includes(n)
  )

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logScrollRef.current) {
      logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight
    }
  }, [logs])

  // Auto-switch to logs view when discovering starts
  useEffect(() => {
    if (isDiscovering) {
      setActiveView('logs')
    }
  }, [isDiscovering])

  const hasLogs = logs.length > 0

  return (
    <div className="h-full flex flex-col">
      {/* Header with tab-style toggle and search button */}
      <div className="flex items-center justify-between border-b">
        {/* Tab-style toggle */}
        <div className="flex">
          <button
            type="button"
            onClick={() => setActiveView('filters')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeView === 'filters'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
          </button>
          <button
            type="button"
            onClick={() => setActiveView('logs')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeView === 'logs'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <List className="h-3.5 w-3.5" />
            Logs
            {hasLogs && resultCount > 0 && (
              <span className="ml-1 text-xs bg-green-500 text-white px-1.5 py-0.5 rounded-full">
                {resultCount}
              </span>
            )}
          </button>
        </div>
        <Button
          onClick={onSearch}
          disabled={isDiscovering}
          size="sm"
          className="gap-2 mb-2"
        >
          {isDiscovering ? (
            <>
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Searching...
            </>
          ) : hasDiscovered ? (
            <>
              <RotateCcw className="h-3.5 w-3.5" />
              Search Again
            </>
          ) : (
            <>
              <Search className="h-3.5 w-3.5" />
              Search
            </>
          )}
        </Button>
      </div>

      {/* Content area with grey card background */}
      <div className="flex-1 min-h-0 bg-muted/50 rounded-lg p-4 mt-4">
        {activeView === 'filters' ? (
          /* Filters View */
          <div className="space-y-4">
            {/* Discovery Sources */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Sources</label>
              <div className="flex flex-wrap gap-2">
                {DISCOVERY_SOURCES.map((source) => (
                  <PillButton
                    key={source.id}
                    selected={selectedSources.has(source.id)}
                    onClick={() => onToggleSource(source.id)}
                    disabled={!source.enabled || isDiscovering}
                    title={source.note}
                  >
                    {source.label}
                    {source.status === 'coming_soon' && (
                      <span className="ml-1 text-xs opacity-50">(soon)</span>
                    )}
                  </PillButton>
                ))}
              </div>
            </div>

            {/* Cuisine Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Cuisine (optional)</label>
              <div className="flex flex-wrap gap-2">
                <PillButton
                  selected={selectedCuisine === null}
                  onClick={() => onCuisineChange(null)}
                  disabled={isDiscovering}
                >
                  All
                </PillButton>
                {CUISINE_TYPES.slice(0, 8).map((cuisine) => (
                  <PillButton
                    key={cuisine}
                    selected={selectedCuisine === cuisine}
                    onClick={() => onCuisineChange(cuisine)}
                    disabled={isDiscovering}
                  >
                    {cuisine}
                  </PillButton>
                ))}
              </div>
            </div>

            {/* Party Size Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Party Size</label>
              <div className="flex flex-wrap gap-2">
                {PARTY_SIZE_OPTIONS.map((option) => (
                  <PillButton
                    key={option.label}
                    selected={partySizeMin === option.min && partySizeMax === option.max}
                    onClick={() => onPartySizeChange(option.min, option.max)}
                    disabled={isDiscovering}
                  >
                    {option.label}
                  </PillButton>
                ))}
              </div>
            </div>

            {/* Location Filter */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Location</label>

              {/* Location mode toggle */}
              <div className="flex gap-1 p-1 bg-muted rounded-lg">
                {LOCATION_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => onLocationModeChange(mode.id)}
                    disabled={isDiscovering}
                    className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      locationMode === mode.id
                        ? 'bg-white text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {/* Neighborhoods mode */}
              {locationMode === 'neighborhoods' && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Select neighborhoods from the dropdown or click on the map
                  </p>
                  <Select
                    value=""
                    onValueChange={handleAddNeighborhood}
                    disabled={isDiscovering || availableNeighborhoods.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Add neighborhood..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableNeighborhoods.map((neighborhood) => (
                        <SelectItem key={neighborhood} value={neighborhood}>
                          {neighborhood}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Selected neighborhoods as removable pills */}
                  {selectedNeighborhoods.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedNeighborhoods.map((neighborhood) => (
                        <span
                          key={neighborhood}
                          className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium"
                        >
                          {neighborhood}
                          <button
                            type="button"
                            onClick={() => handleRemoveNeighborhood(neighborhood)}
                            disabled={isDiscovering}
                            className="hover:bg-primary/20 rounded-full p-0.5 transition-colors disabled:opacity-50"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Radius mode */}
              {locationMode === 'radius' && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Search within distance from map center
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {RADIUS_OPTIONS.map((option) => (
                      <PillButton
                        key={option.id}
                        selected={selectedRadius === option.id}
                        onClick={() => onRadiusChange(option.id)}
                        disabled={isDiscovering}
                      >
                        {option.label}
                      </PillButton>
                    ))}
                  </div>
                </div>
              )}

              {/* Map area mode */}
              {locationMode === 'map_area' && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Search will use the current visible map area. Pan and zoom the map to adjust.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Logs View */
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">
                {isDiscovering ? 'Discovering...' : 'Activity Log'}
              </label>
              {hasDiscovered && !isDiscovering && resultCount > 0 && (
                <span className="text-sm font-medium text-green-600">
                  {resultCount} found
                </span>
              )}
            </div>

            <div
              ref={logScrollRef}
              className="flex-1 overflow-y-auto font-mono text-xs space-y-1"
            >
              {logs.length === 0 ? (
                <p className="text-muted-foreground">No discovery logs yet. Click Search to start.</p>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex gap-2"
                  >
                    <span className="text-muted-foreground shrink-0">
                      [{formatTime(log.timestamp)}]
                    </span>
                    <span className={getLevelColor(log.level)}>
                      {getLevelIcon(log.level)}
                    </span>
                    <span className={log.level === 'success' ? 'text-green-600' : 'text-foreground'}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
              {isDiscovering && (
                <div className="flex gap-2 items-center">
                  <span className="text-muted-foreground shrink-0">
                    [{formatTime(new Date())}]
                  </span>
                  <span className="text-muted-foreground animate-pulse">▊</span>
                </div>
              )}
            </div>

            {/* Re-run button at bottom of log when not discovering */}
            {hasDiscovered && !isDiscovering && (
              <Button
                onClick={onSearch}
                variant="outline"
                size="sm"
                className="w-full gap-2 mt-3"
              >
                <RotateCcw className="h-3 w-3" />
                Run Again with Current Filters
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Map card wrapper - puts the map inside an Airbnb-style card (edge-to-edge)
 */
export function DiscoveryMapCard({ children, isDiscovering }: DiscoveryMapCardProps) {
  return (
    <div className="shadow-lg border border-gray-100 bg-white rounded-2xl overflow-hidden h-[500px]">
      <div className={`h-full ${isDiscovering ? 'opacity-75 pointer-events-none' : ''}`}>
        {children}
      </div>
    </div>
  )
}
