'use client'

import { X, Star, MapPin, Users } from 'lucide-react'
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
    <div className="animate-in fade-in zoom-in-95 duration-200">
      {/* Airbnb-style floating card - no pointer arrow */}
      <div
        className="bg-white rounded-xl shadow-xl border border-gray-200 w-[260px] overflow-hidden cursor-pointer hover:shadow-2xl transition-shadow"
        onClick={onViewDetails}
      >
        {/* Image area with close button */}
        <div className="relative">
          {/* Placeholder image - gradient background */}
          <div className="h-[140px] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <span className="text-5xl opacity-40">🍽️</span>
          </div>

          {/* Close button - top right */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            className="absolute top-2 right-2 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:bg-white hover:scale-105 transition-all"
          >
            <X className="w-4 h-4 text-gray-700" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 space-y-1">
          {/* Name and rating row */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-[15px] text-gray-900 leading-snug line-clamp-1">
              {vendor.name}
            </h3>
            {vendor.rating && (
              <div className="flex items-center gap-1 shrink-0">
                <Star className="w-3 h-3 fill-current text-gray-900" />
                <span className="text-sm font-medium">{vendor.rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* Cuisine and price */}
          <p className="text-sm text-gray-500 line-clamp-1">
            {[
              vendor.cuisine,
              vendor.priceLevel ? formatPriceLevel(vendor.priceLevel) : null,
            ]
              .filter(Boolean)
              .join(' · ') || 'Restaurant'}
          </p>

          {/* Location */}
          <div className="flex items-center gap-3 text-sm text-gray-500">
            {location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{location}</span>
              </div>
            )}
            {capacity && (
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{capacity}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
