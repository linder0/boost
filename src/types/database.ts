// Database types and enums
export type VendorStatus =
  | 'NOT_CONTACTED'
  | 'WAITING'
  | 'PARSED'
  | 'ESCALATION'
  | 'DONE'
  | 'VIABLE'
  | 'REJECTED';

export type DecisionOutcome =
  | 'VIABLE'
  | 'NEGOTIATE'
  | 'REJECT'
  | 'ESCALATE';

export type ConfidenceLevel =
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW';

export type NextActionType =
  | 'AUTO'
  | 'WAITING'
  | 'NEEDS_YOU';

export type MessageSender =
  | 'SYSTEM'
  | 'VENDOR'
  | 'HUMAN';

export type LogEventType =
  | 'OUTREACH'
  | 'FOLLOW_UP'
  | 'REPLY'
  | 'PARSE'
  | 'DECISION'
  | 'ESCALATION'
  | 'DISCOVERY'
  | 'APPROVAL'
  | 'HUMAN_RESPONSE';

export type EscalationCategory =
  | 'low_confidence'
  | 'vendor_questions'
  | 'missing_info'
  | 'budget_edge'
  | 'custom';

export type ChatRole =
  | 'user'
  | 'assistant';

// Database table types
export interface Event {
  id: string;
  user_id: string;
  name: string;
  city: string;
  preferred_dates: { date: string; rank: number }[];
  headcount: number;
  total_budget: number;
  venue_budget_ceiling: number;
  date_flexibility_days: number;
  budget_flexibility_percent: number;
  constraints: {
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
  };
  location_address?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  created_at: string;
  updated_at: string;
}

export type DiscoverySourceType = 'google_places' | 'resy' | 'opentable' | 'beli' | 'manual' | 'csv' | 'demo';

export interface Vendor {
  id: string;
  event_id: string;
  name: string;
  category: string;
  contact_email: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  custom_message?: string | null;
  // Discovery metadata fields
  website?: string | null;
  rating?: number | null;
  email_confidence?: number | null;
  google_place_id?: string | null;
  phone?: string | null;
  discovery_source?: DiscoverySourceType | null;
  // Restaurant-specific fields
  cuisine?: string | null;
  private_dining_capacity_min?: number | null;
  private_dining_capacity_max?: number | null;
  private_dining_minimum?: number | null;
  resy_venue_id?: string | null;
  opentable_id?: string | null;
  beli_rank?: number | null;
  has_private_dining?: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationStep {
  type: LogEventType;
  timestamp: string;
  details: Record<string, unknown>;
}

export interface VendorThread {
  id: string;
  vendor_id: string;
  status: VendorStatus;
  decision: DecisionOutcome | null;
  confidence: ConfidenceLevel | null;
  next_action: NextActionType;
  reason: string | null;
  last_touch: string | null;
  escalation_reason: string | null;
  escalation_category: EscalationCategory | null;
  follow_up_count: number;
  gmail_thread_id: string | null;
  // Approval workflow fields
  outreach_approved: boolean;
  outreach_approved_at: string | null;
  outreach_approved_by: string | null;
  // Automation history
  automation_history: AutomationStep[];
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  thread_id: string;
  sender: MessageSender;
  body: string;
  gmail_message_id: string | null;
  inbound: boolean;
  created_at: string;
}

export interface ParsedResponse {
  id: string;
  message_id: string;
  availability: { date: string; time: string; capacity: number }[] | null;
  quote: {
    amount: number;
    currency: string;
    breakdown: { item: string; amount: number }[];
  } | null;
  inclusions: string[];
  questions: string[];
  sentiment: string | null;
  confidence: ConfidenceLevel;
  raw_data: any;
  created_at: string;
}

export interface SuggestedAction {
  label: string;
  type: 'reply' | 'approve' | 'reject' | 'negotiate';
  draftMessage?: string;
  confidence: number;
}

export interface Decision {
  id: string;
  parsed_response_id: string;
  outcome: DecisionOutcome;
  reason: string;
  proposed_next_action: string | null;
  suggested_actions: SuggestedAction[];
  created_at: string;
}

export interface AutomationLog {
  id: string;
  event_id: string;
  vendor_id: string | null;
  event_type: LogEventType;
  details: any;
  created_at: string;
}

export interface GmailToken {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  token_expiry: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  event_id: string;
  role: ChatRole;
  content: string;
  created_at: string;
}

// Joined types for UI
export interface VendorWithThread extends Vendor {
  vendor_threads?: VendorThread;
}

export interface MessageWithParsed extends Message {
  parsed_responses?: ParsedResponse;
}

export interface ThreadWithMessages extends VendorThread {
  messages: MessageWithParsed[];
}

export interface VendorDetail extends Vendor {
  vendor_threads: ThreadWithMessages;
}
