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
  | 'ESCALATION';

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
  };
  created_at: string;
  updated_at: string;
}

export interface Vendor {
  id: string;
  event_id: string;
  name: string;
  category: string;
  contact_email: string;
  created_at: string;
  updated_at: string;
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
  follow_up_count: number;
  gmail_thread_id: string | null;
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

export interface Decision {
  id: string;
  parsed_response_id: string;
  outcome: DecisionOutcome;
  reason: string;
  proposed_next_action: string | null;
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
