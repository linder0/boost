// Database types for VRM (Vendor Relationship Manager)
// Simplified schema with universal entities table

// ============================================================================
// Enums
// ============================================================================

export type EntityStatus =
  | 'discovered'
  | 'contacted'
  | 'responded'
  | 'confirmed'
  | 'rejected';

export type ActivityAction =
  | 'discovered'
  | 'added_to_event'
  | 'contacted'
  | 'received_response'
  | 'status_changed'
  | 'note_added';

export type ChatRole =
  | 'user'
  | 'assistant';

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

  // Location details
  latitude?: number;
  longitude?: number;
  neighborhood?: string;
  city?: string;

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
  location: string | null;
  description: string | null;
  website: string | null;
  popularity: number | null;
  metadata: EntityMetadata;
  created_at: string;
  updated_at: string;
}

/**
 * Event - a planned occasion linking entities
 */
export interface Event {
  id: string;
  user_id: string;
  name: string;
  city: string;
  description?: string | null;
  preferred_dates: { date: string; rank: number }[];
  headcount: number;
  total_budget: number;
  venue_budget_ceiling: number;
  date_flexibility_days: number;
  budget_flexibility_percent: number;
  constraints: EventConstraints;
  location_address?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  chat_history?: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface EventConstraints {
  ada?: boolean;
  alcohol?: boolean;
  noise?: boolean;
  indoor_outdoor?: 'indoor' | 'outdoor' | 'either';
  neighborhood?: string;
  neighborhoods?: string[];
  cuisines?: string[];
  requires_private_dining?: boolean;
  dietary_restrictions?: string;
  time_frame?: 'morning' | 'afternoon' | 'evening' | 'night';
  venue_types?: string[];
  catering?: {
    food?: boolean;
    drinks?: boolean;
    external_vendors_allowed?: boolean;
  };
}

/**
 * Junction table linking entities to events
 */
export interface EventEntity {
  id: string;
  event_id: string;
  entity_id: string;
  status: EntityStatus;
  notes: string | null;
  outreach_approved: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Activity log for audit trail
 */
export interface ActivityLog {
  id: string;
  entity_id: string | null;
  event_id: string | null;
  action: ActivityAction;
  details: Record<string, unknown>;
  created_at: string;
}

/**
 * Gmail OAuth tokens
 */
export interface GmailToken {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  token_expiry: string;
  created_at: string;
  updated_at: string;
}

/**
 * Chat message (stored in events.chat_history JSONB)
 */
export interface ChatMessage {
  role: ChatRole;
  content: string;
  created_at: string;
}

// ============================================================================
// Joined/View Types
// ============================================================================

/**
 * Entity with its event-specific status
 */
export interface EntityWithStatus extends Entity {
  event_entity?: EventEntity;
}

/**
 * Event with its linked entities
 */
export interface EventWithEntities extends Event {
  entities?: EntityWithStatus[];
}

// ============================================================================
// Legacy type aliases (for gradual migration)
// ============================================================================

/** @deprecated Use Entity instead */
export type Vendor = Entity;

/** @deprecated Use EntityWithStatus instead */
export type VendorWithThread = EntityWithStatus;

/** @deprecated Use DiscoverySource instead */
export type DiscoverySourceType = DiscoverySource;
