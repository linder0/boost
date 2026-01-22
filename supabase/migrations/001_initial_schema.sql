-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE vendor_status AS ENUM ('NOT_CONTACTED', 'WAITING', 'PARSED', 'ESCALATION', 'DONE', 'VIABLE', 'REJECTED');
CREATE TYPE decision_outcome AS ENUM ('VIABLE', 'NEGOTIATE', 'REJECT', 'ESCALATE');
CREATE TYPE confidence_level AS ENUM ('HIGH', 'MEDIUM', 'LOW');
CREATE TYPE next_action_type AS ENUM ('AUTO', 'WAITING', 'NEEDS_YOU');
CREATE TYPE message_sender AS ENUM ('SYSTEM', 'VENDOR', 'HUMAN');
CREATE TYPE log_event_type AS ENUM ('OUTREACH', 'FOLLOW_UP', 'REPLY', 'PARSE', 'DECISION', 'ESCALATION');

-- Events table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    preferred_dates JSONB NOT NULL, -- Array of {date: string, rank: number}
    headcount INTEGER NOT NULL,
    total_budget DECIMAL(10, 2) NOT NULL,
    venue_budget_ceiling DECIMAL(10, 2) NOT NULL,
    date_flexibility_days INTEGER DEFAULT 0,
    budget_flexibility_percent INTEGER DEFAULT 0,
    constraints JSONB DEFAULT '{}', -- {ada: bool, alcohol: bool, noise: bool, indoor_outdoor: string}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendors table
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendor threads table
CREATE TABLE vendor_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL UNIQUE REFERENCES vendors(id) ON DELETE CASCADE,
    status vendor_status DEFAULT 'NOT_CONTACTED',
    decision decision_outcome,
    confidence confidence_level,
    next_action next_action_type DEFAULT 'AUTO',
    reason TEXT,
    last_touch TIMESTAMP WITH TIME ZONE,
    escalation_reason TEXT,
    follow_up_count INTEGER DEFAULT 0,
    gmail_thread_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID NOT NULL REFERENCES vendor_threads(id) ON DELETE CASCADE,
    sender message_sender NOT NULL,
    body TEXT NOT NULL,
    gmail_message_id TEXT,
    inbound BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Parsed responses table
CREATE TABLE parsed_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL UNIQUE REFERENCES messages(id) ON DELETE CASCADE,
    availability JSONB, -- Array of {date: string, time: string, capacity: number}
    quote JSONB, -- {amount: number, currency: string, breakdown: array}
    inclusions TEXT[],
    questions TEXT[],
    sentiment TEXT,
    confidence confidence_level NOT NULL,
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Decisions table
CREATE TABLE decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parsed_response_id UUID NOT NULL UNIQUE REFERENCES parsed_responses(id) ON DELETE CASCADE,
    outcome decision_outcome NOT NULL,
    reason TEXT NOT NULL,
    proposed_next_action TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Automation logs table
CREATE TABLE automation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    event_type log_event_type NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gmail tokens table
CREATE TABLE gmail_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expiry TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_vendors_event_id ON vendors(event_id);
CREATE INDEX idx_vendor_threads_vendor_id ON vendor_threads(vendor_id);
CREATE INDEX idx_vendor_threads_status ON vendor_threads(status);
CREATE INDEX idx_messages_thread_id ON messages(thread_id);
CREATE INDEX idx_messages_gmail_message_id ON messages(gmail_message_id);
CREATE INDEX idx_parsed_responses_message_id ON parsed_responses(message_id);
CREATE INDEX idx_decisions_parsed_response_id ON decisions(parsed_response_id);
CREATE INDEX idx_automation_logs_event_id ON automation_logs(event_id);
CREATE INDEX idx_automation_logs_created_at ON automation_logs(created_at);
CREATE INDEX idx_gmail_tokens_user_id ON gmail_tokens(user_id);

-- Enable Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE parsed_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events
CREATE POLICY "Users can view their own events"
    ON events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own events"
    ON events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own events"
    ON events FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events"
    ON events FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for vendors (inherit from events)
CREATE POLICY "Users can view vendors of their events"
    ON vendors FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id = vendors.event_id
            AND events.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert vendors for their events"
    ON vendors FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id = vendors.event_id
            AND events.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update vendors of their events"
    ON vendors FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id = vendors.event_id
            AND events.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete vendors of their events"
    ON vendors FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id = vendors.event_id
            AND events.user_id = auth.uid()
        )
    );

-- RLS Policies for vendor_threads
CREATE POLICY "Users can view threads of their vendors"
    ON vendor_threads FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM vendors
            JOIN events ON events.id = vendors.event_id
            WHERE vendors.id = vendor_threads.vendor_id
            AND events.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert threads for their vendors"
    ON vendor_threads FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM vendors
            JOIN events ON events.id = vendors.event_id
            WHERE vendors.id = vendor_threads.vendor_id
            AND events.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update threads of their vendors"
    ON vendor_threads FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM vendors
            JOIN events ON events.id = vendors.event_id
            WHERE vendors.id = vendor_threads.vendor_id
            AND events.user_id = auth.uid()
        )
    );

-- RLS Policies for messages
CREATE POLICY "Users can view messages of their threads"
    ON messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM vendor_threads
            JOIN vendors ON vendors.id = vendor_threads.vendor_id
            JOIN events ON events.id = vendors.event_id
            WHERE vendor_threads.id = messages.thread_id
            AND events.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages for their threads"
    ON messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM vendor_threads
            JOIN vendors ON vendors.id = vendor_threads.vendor_id
            JOIN events ON events.id = vendors.event_id
            WHERE vendor_threads.id = messages.thread_id
            AND events.user_id = auth.uid()
        )
    );

-- RLS Policies for parsed_responses
CREATE POLICY "Users can view parsed responses of their messages"
    ON parsed_responses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM messages
            JOIN vendor_threads ON vendor_threads.id = messages.thread_id
            JOIN vendors ON vendors.id = vendor_threads.vendor_id
            JOIN events ON events.id = vendors.event_id
            WHERE messages.id = parsed_responses.message_id
            AND events.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert parsed responses for their messages"
    ON parsed_responses FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM messages
            JOIN vendor_threads ON vendor_threads.id = messages.thread_id
            JOIN vendors ON vendors.id = vendor_threads.vendor_id
            JOIN events ON events.id = vendors.event_id
            WHERE messages.id = parsed_responses.message_id
            AND events.user_id = auth.uid()
        )
    );

-- RLS Policies for decisions
CREATE POLICY "Users can view decisions of their parsed responses"
    ON decisions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM parsed_responses
            JOIN messages ON messages.id = parsed_responses.message_id
            JOIN vendor_threads ON vendor_threads.id = messages.thread_id
            JOIN vendors ON vendors.id = vendor_threads.vendor_id
            JOIN events ON events.id = vendors.event_id
            WHERE parsed_responses.id = decisions.parsed_response_id
            AND events.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert decisions for their parsed responses"
    ON decisions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM parsed_responses
            JOIN messages ON messages.id = parsed_responses.message_id
            JOIN vendor_threads ON vendor_threads.id = messages.thread_id
            JOIN vendors ON vendors.id = vendor_threads.vendor_id
            JOIN events ON events.id = vendors.event_id
            WHERE parsed_responses.id = decisions.parsed_response_id
            AND events.user_id = auth.uid()
        )
    );

-- RLS Policies for automation_logs
CREATE POLICY "Users can view logs of their events"
    ON automation_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id = automation_logs.event_id
            AND events.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert logs for their events"
    ON automation_logs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id = automation_logs.event_id
            AND events.user_id = auth.uid()
        )
    );

-- RLS Policies for gmail_tokens
CREATE POLICY "Users can view their own gmail tokens"
    ON gmail_tokens FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gmail tokens"
    ON gmail_tokens FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own gmail tokens"
    ON gmail_tokens FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own gmail tokens"
    ON gmail_tokens FOR DELETE
    USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_threads_updated_at BEFORE UPDATE ON vendor_threads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gmail_tokens_updated_at BEFORE UPDATE ON gmail_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
