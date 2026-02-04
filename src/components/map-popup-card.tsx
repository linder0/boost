'use client'

import { X, Star, Users, MapPin, ExternalLink } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { formatCapacity, formatPriceLevel } from '@/lib/formatting'

export interface MapPopupVendor {
  id: string
  name: string
  cuisine?: string
  rating?: number
  priceLevel?: number
  capacityMin?: number
  capacityMax?: number
  neighborhood?: string
  address?: string
  city?: string
  hasPrivateDining?: boolean
  website?: string
}

interface MapPopupCardProps {
  vendor: MapPopupVendor
  onClose: () => void
  onViewDetails: () => void
  position?: { x: number; y: number }
}

export function MapPopupCard({
  vendor,
  onClose,
  onViewDetails,
}: MapPopupCardProps) {
  const capacity = formatCapacity(vendor.capacityMin, vendor.capacityMax)
  const location = vendor.neighborhood || vendor.city || ''

  return (
    <div className="absolute z-50 animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-white rounded-xl shadow-xl border border-gray-100 w-[280px] overflow-hidden">
        {/* Header with close button */}
        <div className="relative">
          {/* Placeholder image area - gradient background */}
          <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <span className="text-4xl opacity-50">🍽️</span>
          </div>

          {/* Close button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-gray-50 transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 space-y-2">
          {/* Name and rating */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 leading-tight line-clamp-2">
              {vendor.name}
            </h3>
            {vendor.rating && (
              <div className="flex items-center gap-1 shrink-0">
                <Star className="w-3.5 h-3.5 fill-current text-gray-900" />
                <span className="text-sm font-medium">{vendor.rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* Details row */}
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
            {vendor.cuisine && (
              <span>{vendor.cuisine}</span>
            )}
            {vendor.cuisine && vendor.priceLevel && (
              <span className="text-gray-300">·</span>
            )}
            {vendor.priceLevel && (
              <span>{formatPriceLevel(vendor.priceLevel)}</span>
            )}
            {vendor.hasPrivateDining && (
              <Badge variant="outline" className="text-xs py-0 h-5">
                Private Dining
              </Badge>
            )}
          </div>

          {/* Location and capacity */}
          <div className="flex items-center gap-3 text-sm text-gray-500">
            {location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span className="truncate max-w-[120px]">{location}</span>
              </div>
            )}
            {capacity && (
              <div className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                <span>{capacity}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="flex-1 h-8"
              onClick={(e) => {
                e.stopPropagation()
                onViewDetails()
              }}
            >
              View Details
            </Button>
            {vendor.website && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2"
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(vendor.website, '_blank')
                }}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Arrow pointing down to marker */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 border-r border-b border-gray-100" />
      </div>
    </div>
  )
}
