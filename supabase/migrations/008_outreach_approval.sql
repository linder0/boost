-- Migration: Outreach Approval Workflow
-- Adds approval tracking for human-in-the-loop outreach control

-- Add approval columns to vendor_threads
ALTER TABLE vendor_threads 
ADD COLUMN IF NOT EXISTS outreach_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS outreach_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS outreach_approved_by UUID REFERENCES auth.users(id);

-- Add new log event types for discovery and approval workflow
-- Note: PostgreSQL doesn't allow adding values in a transaction, so we use a workaround
DO $$ 
BEGIN
    -- Add DISCOVERY if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'DISCOVERY' AND enumtypid = 'log_event_type'::regtype) THEN
        ALTER TYPE log_event_type ADD VALUE 'DISCOVERY';
    END IF;
END $$;

DO $$ 
BEGIN
    -- Add APPROVAL if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'APPROVAL' AND enumtypid = 'log_event_type'::regtype) THEN
        ALTER TYPE log_event_type ADD VALUE 'APPROVAL';
    END IF;
END $$;

DO $$ 
BEGIN
    -- Add HUMAN_RESPONSE if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'HUMAN_RESPONSE' AND enumtypid = 'log_event_type'::regtype) THEN
        ALTER TYPE log_event_type ADD VALUE 'HUMAN_RESPONSE';
    END IF;
END $$;

-- Create index for efficient querying of pending approvals
CREATE INDEX IF NOT EXISTS idx_vendor_threads_pending_approval 
ON vendor_threads(outreach_approved) 
WHERE outreach_approved = FALSE AND status = 'NOT_CONTACTED';

-- Add escalation_category column for structured escalation context
ALTER TABLE vendor_threads 
ADD COLUMN IF NOT EXISTS escalation_category TEXT;

-- Add suggested_actions JSONB column to decisions for storing AI-generated suggestions
ALTER TABLE decisions 
ADD COLUMN IF NOT EXISTS suggested_actions JSONB DEFAULT '[]';

-- Add automation_history JSONB column to vendor_threads for tracking automation steps
ALTER TABLE vendor_threads 
ADD COLUMN IF NOT EXISTS automation_history JSONB DEFAULT '[]';

-- Comment on new columns
COMMENT ON COLUMN vendor_threads.outreach_approved IS 'Whether initial outreach has been approved by user';
COMMENT ON COLUMN vendor_threads.outreach_approved_at IS 'Timestamp when outreach was approved';
COMMENT ON COLUMN vendor_threads.outreach_approved_by IS 'User who approved the outreach';
COMMENT ON COLUMN vendor_threads.escalation_category IS 'Category of escalation: low_confidence, vendor_questions, missing_info, budget_edge, custom';
COMMENT ON COLUMN vendor_threads.automation_history IS 'Array of automation steps taken for this thread';
COMMENT ON COLUMN decisions.suggested_actions IS 'AI-generated suggested actions for human review';
