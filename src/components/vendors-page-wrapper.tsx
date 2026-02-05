'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Entity } from '@/types/database'
import { VendorsOverviewMap } from './vendors-overview-map'
import { VendorDrawer } from './vendor-drawer'
import { EmptyState } from './empty-state'
import { VendorsTable, VendorRow, entityToVendorRow } from './vendors-table'
import { Button } from './ui/button'
import { bulkDeleteEntities } from '@/app/actions/entities'
import { Trash2, X, Loader2 } from 'lucide-react'
import { BulkEnrichModal } from './bulk-enrich-modal'

interface VendorsPageWrapperProps {
  vendors: Entity[]
}

export function VendorsPageWrapper({ vendors }: VendorsPageWrapperProps) {
  const router = useRouter()
  const [selectedVendor, setSelectedVendor] = useState<Entity | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)

  // Convert entities to VendorRows
  const vendorRows: VendorRow[] = vendors.map(entityToVendorRow)

  // Toggle individual vendor selection
  const toggleSelection = (vendorId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(vendorId)) {
        next.delete(vendorId)
      } else {
        next.add(vendorId)
      }
      return next
    })
  }

  // Toggle all vendors
  const toggleAll = () => {
    if (selectedIds.size === vendors.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(vendors.map(v => v.id)))
    }
  }

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return

    setIsDeleting(true)
    try {
      await bulkDeleteEntities(Array.from(selectedIds))
      setSelectedIds(new Set())
      router.refresh()
    } catch (error) {
      console.error('Failed to delete vendors:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  // Clear selection
  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  // Handle row click - find the original entity
  const handleRowClick = (row: VendorRow) => {
    const entity = vendors.find(v => v.id === row.id)
    if (entity) {
      setSelectedVendor(entity)
    }
  }

  if (vendors.length === 0) {
    return (
      <EmptyState
        variant="dashed"
        title="No vendors yet"
        description="Discover restaurants and venues or import from CSV"
        action={{
          label: 'Discover Vendors',
          onClick: () => router.push('/discover'),
        }}
        secondaryAction={{
          label: 'Import CSV',
          onClick: () => router.push('/import'),
        }}
      />
    )
  }

  return (
    <>
      <VendorsOverviewMap
        vendors={vendors}
        onVendorClick={setSelectedVendor}
      />

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Vendors</h2>
          <div className="flex gap-2">
            <BulkEnrichModal onComplete={() => router.refresh()} />
            <Button
              variant="outline"
              onClick={() => router.push('/discover')}
            >
              Discover More
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/import')}
            >
              Import CSV
            </Button>
          </div>
        </div>

        {/* Selection action bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {selectedIds.size} vendor{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="h-8 px-2 text-muted-foreground"
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected
                </>
              )}
            </Button>
          </div>
        )}

        <VendorsTable
          vendors={vendorRows}
          selectedIds={selectedIds}
          onToggleSelection={toggleSelection}
          onToggleAll={toggleAll}
          onRowClick={handleRowClick}
          mode="saved"
          showEnrichment={true}
          onEnrich={() => router.refresh()}
        />
      </div>

      <VendorDrawer
        vendor={selectedVendor}
        onClose={() => setSelectedVendor(null)}
      />
    </>
  )
}
