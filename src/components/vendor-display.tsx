'use client'

import { Badge } from './ui/badge'

// ============================================================================
// Types
// ============================================================================

export interface VendorNameDisplayProps {
  name: string
  rating?: number | null
  website?: string | null
  discoverySource?: string | null
  showDiscoveryBadge?: boolean
  className?: string
}

export interface VendorEmailDisplayProps {
  email: string
  emailConfidence?: number | null
  className?: string
}

export interface VendorDisplayProps extends VendorNameDisplayProps, VendorEmailDisplayProps {
  showEmail?: boolean
}

// ============================================================================
// VendorNameDisplay - Vendor name with rating and website link
// ============================================================================

export function VendorNameDisplay({
  name,
  rating,
  website,
  discoverySource,
  showDiscoveryBadge = false,
  className,
}: VendorNameDisplayProps) {
  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <span className="font-medium">{name}</span>
      {showDiscoveryBadge && discoverySource === 'google_places' && (
        <Badge variant="outline" className="text-[10px] px-1 py-0 text-blue-600 border-blue-300">
          Discovered
        </Badge>
      )}
      {rating != null && (
        <span className="flex items-center gap-0.5 text-xs text-amber-600">
          <span>★</span>
          <span>{rating.toFixed(1)}</span>
        </span>
      )}
      {website && (
        <a
          href={website}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-blue-600 hover:text-blue-800 text-xs"
        >
          ↗
        </a>
      )}
    </div>
  )
}

// ============================================================================
// VendorEmailDisplay - Email with confidence badge
// ============================================================================

export function VendorEmailDisplay({
  email,
  emailConfidence,
  className,
}: VendorEmailDisplayProps) {
  return (
    <div className={`flex items-center gap-1.5 ${className || ''}`}>
      <span>{email}</span>
      {emailConfidence != null && (
        <Badge
          variant={emailConfidence >= 80 ? 'default' : 'secondary'}
          className="text-[10px] px-1 py-0"
        >
          {emailConfidence}%
        </Badge>
      )}
    </div>
  )
}

// ============================================================================
// VendorDisplay - Combined name and email display
// ============================================================================

export function VendorDisplay({
  name,
  rating,
  website,
  discoverySource,
  showDiscoveryBadge = false,
  email,
  emailConfidence,
  showEmail = true,
  className,
}: VendorDisplayProps) {
  return (
    <div className={`space-y-1 ${className || ''}`}>
      <VendorNameDisplay
        name={name}
        rating={rating}
        website={website}
        discoverySource={discoverySource}
        showDiscoveryBadge={showDiscoveryBadge}
      />
      {showEmail && (
        <VendorEmailDisplay
          email={email}
          emailConfidence={emailConfidence}
        />
      )}
    </div>
  )
}
