'use client'

import { formatDistanceToNow } from 'date-fns'
import { Entity } from '@/types/database'
import { Badge } from './ui/badge'
import { Checkbox } from './ui/checkbox'
import { VendorNameDisplay, VendorEmailDisplay } from './vendor-display'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table'
import { Users, DollarSign } from 'lucide-react'
import {
  formatCapacityFromVendor,
  formatMinimum,
  formatSource,
  formatPriceLevel,
} from '@/lib/formatting'

// Unified vendor/restaurant type for both discovery and saved entities
export interface VendorRow {
  id: string
  name: string
  email?: string
  emailConfidence?: number
  cuisine?: string
  priceLevel?: number
  capacityMin?: number
  capacityMax?: number
  privateDiningCapacityMin?: number
  privateDiningCapacityMax?: number
  privateDiningMinimum?: number
  hasPrivateDining?: boolean
  neighborhood?: string
  address?: string
  city?: string
  discoverySource?: string
  rating?: number
  website?: string
  beliRank?: number
  reservationUrl?: string
  createdAt?: string
  // For discovery mode
  isNew?: boolean
  isAlreadyAdded?: boolean
}

interface VendorsTableProps {
  vendors: VendorRow[]
  selectedIds: Set<string>
  onToggleSelection: (id: string) => void
  onToggleAll: () => void
  onRowClick?: (vendor: VendorRow) => void
  // Display mode
  mode: 'discovery' | 'saved'
  // Whether selection is enabled
  selectable?: boolean
}

export function VendorsTable({
  vendors,
  selectedIds,
  onToggleSelection,
  onToggleAll,
  onRowClick,
  mode,
  selectable = true,
}: VendorsTableProps) {
  const allSelected = selectedIds.size === vendors.length && vendors.length > 0
  const someSelected = selectedIds.size > 0 && selectedIds.size < vendors.length

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  data-state={someSelected ? 'indeterminate' : allSelected ? 'checked' : 'unchecked'}
                  onCheckedChange={onToggleAll}
                  aria-label="Select all"
                />
              </TableHead>
            )}
            <TableHead>Name</TableHead>
            <TableHead>Cuisine</TableHead>
            <TableHead>Capacity</TableHead>
            <TableHead>Minimum</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Neighborhood</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Source</TableHead>
            <TableHead className="text-right">
              {mode === 'discovery' ? 'Status' : 'Added'}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vendors.map((vendor, index) => {
            const isSelected = selectedIds.has(vendor.id)
            const isDisabled = mode === 'discovery' && vendor.isAlreadyAdded

            return (
              <TableRow
                key={vendor.id}
                className={`
                  cursor-pointer hover:bg-muted
                  ${isSelected ? 'bg-muted/50' : ''}
                  ${isDisabled ? 'opacity-60' : ''}
                  ${mode === 'discovery' ? 'animate-in fade-in slide-in-from-top-2 duration-300' : ''}
                `}
                style={mode === 'discovery' ? { animationDelay: `${index * 50}ms` } : undefined}
                onClick={() => {
                  if (!isDisabled && onRowClick) {
                    onRowClick(vendor)
                  } else if (!isDisabled && selectable) {
                    onToggleSelection(vendor.id)
                  }
                }}
              >
                {selectable && (
                  <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleSelection(vendor.id)}
                      disabled={isDisabled}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <VendorNameDisplay
                        name={vendor.name}
                        rating={vendor.rating}
                        website={vendor.website}
                      />
                      {vendor.hasPrivateDining && (
                        <Badge variant="outline" className="text-xs">
                          Private Dining
                        </Badge>
                      )}
                    </div>
                    {vendor.priceLevel && (
                      <div className="text-xs text-muted-foreground">
                        {formatPriceLevel(vendor.priceLevel)}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{vendor.cuisine || '-'}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm">{formatCapacityFromVendor(vendor)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm">{formatMinimum(vendor.privateDiningMinimum)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <VendorEmailDisplay
                    email={vendor.email || ''}
                    emailConfidence={vendor.emailConfidence}
                  />
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {vendor.neighborhood || vendor.city || '-'}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className="text-sm max-w-[200px] block truncate"
                    title={vendor.address || ''}
                  >
                    {vendor.address || '-'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {vendor.discoverySource && (
                      <Badge variant="secondary" className="text-xs">
                        {formatSource(vendor.discoverySource)}
                      </Badge>
                    )}
                    {vendor.beliRank && (
                      <Badge variant="outline" className="text-xs">
                        #{vendor.beliRank}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {mode === 'discovery' ? (
                    vendor.isAlreadyAdded ? (
                      <Badge variant="outline" className="text-green-600 border-green-300">
                        Added
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">New</span>
                    )
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {vendor.createdAt
                        ? formatDistanceToNow(new Date(vendor.createdAt), { addSuffix: true })
                        : '-'}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

// Helper to convert Entity to VendorRow
export function entityToVendorRow(entity: Entity): VendorRow {
  return {
    id: entity.id,
    name: entity.name,
    email: entity.metadata?.email,
    emailConfidence: entity.metadata?.email_confidence,
    cuisine: entity.metadata?.cuisine,
    priceLevel: entity.metadata?.price_level,
    capacityMin: entity.metadata?.private_dining_capacity_min,
    capacityMax: entity.metadata?.private_dining_capacity_max,
    privateDiningCapacityMin: entity.metadata?.private_dining_capacity_min,
    privateDiningCapacityMax: entity.metadata?.private_dining_capacity_max,
    privateDiningMinimum: entity.metadata?.private_dining_minimum,
    hasPrivateDining: entity.metadata?.has_private_dining,
    neighborhood: entity.neighborhood || undefined,
    address: entity.address || undefined,
    city: entity.city || undefined,
    discoverySource: entity.metadata?.discovery_source,
    rating: entity.metadata?.rating,
    website: entity.website || undefined,
    beliRank: entity.metadata?.beli_rank,
    createdAt: entity.created_at,
  }
}

// Helper to convert discovered restaurant to VendorRow
export function discoveredToVendorRow(
  restaurant: {
    name: string
    email?: string
    emailConfidence?: number
    cuisine?: string
    priceLevel?: number
    capacityMin?: number
    capacityMax?: number
    privateDiningCapacityMin?: number
    privateDiningCapacityMax?: number
    privateDiningMinimum?: number
    hasPrivateDining?: boolean
    neighborhood?: string
    address?: string
    city?: string
    discoverySource?: string
    rating?: number
    website?: string
    beliRank?: number
    reservationUrl?: string
  },
  isAlreadyAdded: boolean
): VendorRow {
  // Use email or composite key as ID for discovery
  const id = restaurant.email || `${restaurant.name}-${restaurant.discoverySource || 'unknown'}`
  return {
    id,
    name: restaurant.name,
    email: restaurant.email,
    emailConfidence: restaurant.emailConfidence,
    cuisine: restaurant.cuisine,
    priceLevel: restaurant.priceLevel,
    capacityMin: restaurant.capacityMin,
    capacityMax: restaurant.capacityMax,
    privateDiningCapacityMin: restaurant.privateDiningCapacityMin,
    privateDiningCapacityMax: restaurant.privateDiningCapacityMax,
    privateDiningMinimum: restaurant.privateDiningMinimum,
    hasPrivateDining: restaurant.hasPrivateDining,
    neighborhood: restaurant.neighborhood,
    address: restaurant.address,
    city: restaurant.city,
    discoverySource: restaurant.discoverySource,
    rating: restaurant.rating,
    website: restaurant.website,
    beliRank: restaurant.beliRank,
    reservationUrl: restaurant.reservationUrl,
    isNew: true,
    isAlreadyAdded,
  }
}
