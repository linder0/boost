'use client'

import { useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table'
import { Checkbox } from './ui/checkbox'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import {
  sortCategories,
  getCategoryLabel,
  groupByCategory,
  type EntityCategory,
} from '@/lib/entities'
import { DisplayEntity } from '@/types/entities'
import { formatDistanceToNow } from 'date-fns'
import { VendorNameDisplay, VendorEmailDisplay } from './vendor-display'

// ============================================================================
// Types
// ============================================================================

export interface EntityTableColumn {
  key: string
  label: string
  render?: (entity: DisplayEntity, index: number) => React.ReactNode
  className?: string
}

export interface EntityTableProps {
  entities: DisplayEntity[]
  selectedIds?: Set<string>
  onSelectionChange?: (selectedIds: Set<string>) => void
  onEntityClick?: (entity: DisplayEntity) => void
  columns?: EntityTableColumn[]
  groupByCategory?: boolean
  showCategoryActions?: boolean
  categoryActions?: (category: string, entities: DisplayEntity[]) => React.ReactNode
  emptyMessage?: string
  isStreaming?: boolean
  existingEmails?: Set<string>
  selectable?: boolean
  getEntityId?: (entity: DisplayEntity) => string
}

// ============================================================================
// Default Columns
// ============================================================================

const defaultColumns: EntityTableColumn[] = [
  {
    key: 'name',
    label: 'Name',
    render: (entity) => (
      <VendorNameDisplay
        name={entity.name}
        rating={entity.rating}
        website={entity.website}
      />
    ),
  },
  {
    key: 'email',
    label: 'Contact Email',
    render: (entity) => (
      <VendorEmailDisplay
        email={entity.contactEmail}
        emailConfidence={entity.emailConfidence}
      />
    ),
  },
  {
    key: 'price',
    label: 'Price Range',
    render: (entity) =>
      entity.pricePerPersonMin && entity.pricePerPersonMax
        ? `$${entity.pricePerPersonMin}-$${entity.pricePerPersonMax}/pp`
        : '-',
  },
  {
    key: 'location',
    label: 'Location',
    render: (entity) => (
      <span className="text-sm">{entity.neighborhood || entity.city || '-'}</span>
    ),
  },
]

// ============================================================================
// Helper Functions
// ============================================================================

function getDefaultEntityId(entity: DisplayEntity): string {
  return entity.id || entity.contactEmail || entity.name
}

// ============================================================================
// Component
// ============================================================================

export function EntityTable({
  entities,
  selectedIds = new Set(),
  onSelectionChange,
  onEntityClick,
  columns = defaultColumns,
  groupByCategory: shouldGroup = true,
  showCategoryActions = false,
  categoryActions,
  emptyMessage = 'No entities found',
  isStreaming = false,
  existingEmails = new Set(),
  selectable = true,
  getEntityId = getDefaultEntityId,
}: EntityTableProps) {
  // Group entities by category
  const groupedEntities = useMemo(() => {
    if (!shouldGroup) {
      return { 'All': entities }
    }
    return groupByCategory(entities)
  }, [entities, shouldGroup])

  // Get sorted category keys
  const sortedCategories = useMemo(() => {
    return sortCategories(Object.keys(groupedEntities))
  }, [groupedEntities])

  // Toggle selection for a single entity
  const toggleEntity = (entityId: string) => {
    if (!onSelectionChange) return
    const newSelected = new Set(selectedIds)
    if (newSelected.has(entityId)) {
      newSelected.delete(entityId)
    } else {
      newSelected.add(entityId)
    }
    onSelectionChange(newSelected)
  }

  // Toggle all entities in a category
  const toggleCategory = (categoryEntities: DisplayEntity[]) => {
    if (!onSelectionChange) return
    const categoryIds = categoryEntities.map(getEntityId)
    const allSelected = categoryIds.every((id) => selectedIds.has(id))

    const newSelected = new Set(selectedIds)
    categoryIds.forEach((id) => {
      if (allSelected) {
        newSelected.delete(id)
      } else {
        newSelected.add(id)
      }
    })
    onSelectionChange(newSelected)
  }

  // Toggle all entities
  const toggleAll = () => {
    if (!onSelectionChange) return
    const allIds = entities.map(getEntityId)
    const allSelected = allIds.every((id) => selectedIds.has(id))

    if (allSelected) {
      onSelectionChange(new Set())
    } else {
      onSelectionChange(new Set(allIds))
    }
  }

  if (entities.length === 0 && !isStreaming) {
    return (
      <div className="rounded-md border border-dashed p-12 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Selection summary */}
      {selectable && entities.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {selectedIds.size} of {entities.length} selected
            {isStreaming && (
              <span className="ml-2 text-xs">(streaming...)</span>
            )}
          </p>
          {onSelectionChange && (
            <Button variant="ghost" size="sm" onClick={toggleAll}>
              {selectedIds.size === entities.length ? 'Deselect All' : 'Select All'}
            </Button>
          )}
        </div>
      )}

      {/* Category groups */}
      {sortedCategories.map((category) => {
        const categoryEntities = groupedEntities[category]
        const categorySelectedCount = categoryEntities.filter((e) =>
          selectedIds.has(getEntityId(e))
        ).length

        return (
          <div key={category} className="mb-4 last:mb-0">
            {/* Category header */}
            {shouldGroup && (
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {getCategoryLabel(category as EntityCategory, true)} ({categoryEntities.length})
                  </h4>
                  {categorySelectedCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {categorySelectedCount} selected
                    </Badge>
                  )}
                </div>
                {showCategoryActions && categoryActions && (
                  <div className="flex gap-2">
                    {categoryActions(category, categoryEntities)}
                  </div>
                )}
              </div>
            )}

            {/* Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {selectable && (
                      <TableHead className="w-12">
                        <Checkbox
                          checked={categorySelectedCount === categoryEntities.length && categoryEntities.length > 0}
                          onCheckedChange={() => toggleCategory(categoryEntities)}
                          aria-label={`Select all ${category}`}
                        />
                      </TableHead>
                    )}
                    {columns.map((col) => (
                      <TableHead key={col.key} className={col.className}>
                        {col.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryEntities.map((entity, index) => {
                    const entityId = getEntityId(entity)
                    const isAlreadyAdded = existingEmails.has(entity.contactEmail.toLowerCase())
                    const isSelected = selectedIds.has(entityId)

                    return (
                      <TableRow
                        key={entityId}
                        className={`cursor-pointer animate-in fade-in slide-in-from-top-2 duration-300 ${isAlreadyAdded ? 'opacity-60' : ''}`}
                        style={{ animationDelay: `${index * 50}ms` }}
                        onClick={() => {
                          if (!isAlreadyAdded && onEntityClick) {
                            onEntityClick(entity)
                          } else if (!isAlreadyAdded && selectable) {
                            toggleEntity(entityId)
                          }
                        }}
                      >
                        {selectable && (
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleEntity(entityId)}
                              disabled={isAlreadyAdded}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </TableCell>
                        )}
                        {columns.map((col) => (
                          <TableCell key={col.key} className={col.className}>
                            {col.render
                              ? col.render(entity, index)
                              : (entity as Record<string, unknown>)[col.key]?.toString() || '-'
                            }
                          </TableCell>
                        ))}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// Pre-built Column Sets
// ============================================================================

export const discoveryColumns: EntityTableColumn[] = [
  ...defaultColumns,
  {
    key: 'status',
    label: 'Status',
    render: (entity) =>
      entity.isAlreadyAdded ? (
        <Badge variant="outline" className="text-green-600 border-green-300">
          Added
        </Badge>
      ) : (
        <span className="text-sm text-muted-foreground">New</span>
      ),
  },
]

export const vendorColumns: EntityTableColumn[] = [
  {
    key: 'name',
    label: 'Name',
    render: (entity) => <span className="font-medium">{entity.name}</span>,
  },
  {
    key: 'email',
    label: 'Contact Email',
    render: (entity) => entity.contactEmail,
  },
  {
    key: 'status',
    label: 'Status',
    render: (entity) => entity.status ? (
      <Badge variant="secondary">{entity.status}</Badge>
    ) : null,
  },
]
