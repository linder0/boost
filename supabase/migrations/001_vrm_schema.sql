-- VRM (Vendor Relationship Manager) Schema
-- Clean slate for new Supabase project

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Core Tables
-- ============================================================================

-- Events table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    description TEXT,
    preferred_dates JSONB DEFAULT '[]',
    headcount INTEGER NOT NULL,
    total_budget DECIMAL(10, 2) NOT NULL,
    venue_budget_ceiling DECIMAL(10, 2),
    date_flexibility_days INTEGER DEFAULT 0,
    budget_flexibility_percent INTEGER DEFAULT 0,
    constraints JSONB DEFAULT '{}',
    location_address TEXT,
    location_lat DECIMAL(10, 7),
    location_lng DECIMAL(10, 7),
    chat_history JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Entities table (universal VRM)
CREATE TABLE entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    location TEXT,
    description TEXT,
    website TEXT,
    popularity FLOAT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event-Entity junction table
CREATE TABLE event_entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'discovered',
    notes TEXT,
    outreach_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, entity_id)
);

-- Activity log
CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID REFERENCES entities(id) ON DELETE SET NULL,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gmail tokens (OAuth requirement)
CREATE TABLE gmail_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expiry TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_entities_name ON entities(name);
CREATE INDEX idx_entities_tags ON entities USING GIN(tags);
CREATE INDEX idx_entities_metadata ON entities USING GIN(metadata);
CREATE INDEX idx_event_entities_event ON event_entities(event_id);
CREATE INDEX idx_event_entities_entity ON event_entities(entity_id);
CREATE INDEX idx_activity_log_entity ON activity_log(entity_id);
CREATE INDEX idx_activity_log_event ON activity_log(event_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at);

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_tokens ENABLE ROW LEVEL SECURITY;

-- Events: Users can only access their own events
CREATE POLICY "Users can view their own events"
    ON events FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own events"
    ON events FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own events"
    ON events FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events"
    ON events FOR DELETE USING (auth.uid() = user_id);

-- Entities: Public read, authenticated write
CREATE POLICY "Anyone can view entities"
    ON entities FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert entities"
    ON entities FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update entities"
    ON entities FOR UPDATE USING (auth.role() = 'authenticated');

-- Event entities: Based on event ownership
CREATE POLICY "Users can view their event entities"
    ON event_entities FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM events WHERE events.id = event_entities.event_id AND events.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert event entities"
    ON event_entities FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM events WHERE events.id = event_entities.event_id AND events.user_id = auth.uid()
    ));

CREATE POLICY "Users can update event entities"
    ON event_entities FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM events WHERE events.id = event_entities.event_id AND events.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete event entities"
    ON event_entities FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM events WHERE events.id = event_entities.event_id AND events.user_id = auth.uid()
    ));

-- Activity log: Based on event ownership
CREATE POLICY "Users can view their activity logs"
    ON activity_log FOR SELECT
    USING (event_id IS NULL OR EXISTS (
        SELECT 1 FROM events WHERE events.id = activity_log.event_id AND events.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert activity logs"
    ON activity_log FOR INSERT
    WITH CHECK (event_id IS NULL OR EXISTS (
        SELECT 1 FROM events WHERE events.id = activity_log.event_id AND events.user_id = auth.uid()
    ));

-- Gmail tokens: Users can only access their own
CREATE POLICY "Users can view their own gmail tokens"
    ON gmail_tokens FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gmail tokens"
    ON gmail_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own gmail tokens"
    ON gmail_tokens FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own gmail tokens"
    ON gmail_tokens FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- Triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_entities_updated_at
    BEFORE UPDATE ON entities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_entities_updated_at
    BEFORE UPDATE ON event_entities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gmail_tokens_updated_at
    BEFORE UPDATE ON gmail_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
