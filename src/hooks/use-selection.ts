'use client'

import { useState, useCallback } from 'react'

/**
 * Reusable selection state for lists of items.
 * Supports toggle single, toggle all, toggle category, and clear.
 */
export function useSelection<T>(
  items: T[],
  getId: (item: T) => string = (item) => (item as { id: string }).id
) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allIds = items.map(getId)
      const allSelected = allIds.length > 0 && allIds.every((id) => prev.has(id))
      return allSelected ? new Set() : new Set(allIds)
    })
  }, [items, getId])

  const toggleGroup = useCallback(
    (groupItems: T[]) => {
      setSelectedIds((prev) => {
        const groupIds = groupItems.map(getId)
        const allSelected = groupIds.every((id) => prev.has(id))
        const next = new Set(prev)
        groupIds.forEach((id) => {
          if (allSelected) next.delete(id)
          else next.add(id)
        })
        return next
      })
    },
    [getId]
  )

  const clear = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  )

  const allSelected = items.length > 0 && items.every((item) => selectedIds.has(getId(item)))
  const someSelected = selectedIds.size > 0 && !allSelected

  return {
    selectedIds,
    setSelectedIds,
    toggle,
    toggleAll,
    toggleGroup,
    clear,
    isSelected,
    allSelected,
    someSelected,
    count: selectedIds.size,
  }
}
