// Database types for VRM (Vendor Relationship Manager)
// Simplified schema - no authentication, just entities

// ============================================================================
// Enums
// ============================================================================

export type ActivityAction =
  | 'discovered'
  | 'created'
  | 'updated'
  | 'deleted';

export type DiscoverySource =
  | 'google_places'
  | 'resy'
  | 'opentable'
  | 'beli'
  | 'exa'
  | 'clawdbot'
  | 'manual'
  | 'csv'
  | 'demo';

// ============================================================================
// Entity Metadata (stored in JSONB)
// ============================================================================

export interface EntityMetadata {
  // Contact
  email?: string;
  phone?: string;

  // Discovery
  discovery_source?: DiscoverySource;
  google_place_id?: string;
  rating?: number;
  review_count?: number;
  email_confidence?: number;

  // Restaurant-specific
  cuisine?: string;
  price_level?: number;
  has_private_dining?: boolean;
  private_dining_capacity_min?: number;
  private_dining_capacity_max?: number;
  private_dining_minimum?: number;

  // External platform IDs
  resy_venue_id?: string;
  opentable_id?: string;
  beli_rank?: number;

  // Extensible - any other fields
  [key: string]: unknown;
}

// ============================================================================
// Core Tables
// ============================================================================

/**
 * Universal entity in the VRM
 * Can be a venue, restaurant, vendor, funder, host, person, etc.
 */
export interface Entity {
  id: string;
  name: string;
  tags: string[];
  // Legacy location field (kept for compatibility)
  location: string | null;
  // Granular location fields
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  // Other fields
  description: string | null;
  website: string | null;
  popularity: number | null;
  metadata: EntityMetadata;
  created_at: string;
  updated_at: string;
}

/**
 * Activity log for audit trail
 */
export interface ActivityLog {
  id: string;
  entity_id: string | null;
  action: ActivityAction;
  details: Record<string, unknown>;
  created_at: string;
}

// ============================================================================
// Legacy type aliases (for compatibility)
// ============================================================================

/** @deprecated Use Entity instead */
export type Vendor = Entity;

/** @deprecated Use Entity instead */
export type EntityWithStatus = Entity;
