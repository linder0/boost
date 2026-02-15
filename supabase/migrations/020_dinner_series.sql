-- Migration: Dinner Series Dashboard
-- Creates events and event_entities tables without auth dependency
-- For use with the dinner series production dashboard

-- ============================================================================
-- Enable UUID extension
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Updated_at trigger function (if not exists)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Events table (no auth dependency)
-- ============================================================================

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    date TEXT,                    -- ISO date string
    city TEXT,
    headcount INTEGER,
    total_budget DECIMAL(10, 2),
    description TEXT,
    constraints JSONB DEFAULT '{}',
    chat_history JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Entities table (ensure it exists with all columns)
-- ============================================================================

CREATE TABLE IF NOT EXISTS entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    location TEXT,
    address TEXT,
    neighborhood TEXT,
    city TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    description TEXT,
    website TEXT,
    popularity FLOAT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns that may not exist yet
ALTER TABLE entities ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE entities ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE entities ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE entities ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE entities ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- ============================================================================
-- Event-Entity junction table
-- ============================================================================

CREATE TABLE IF NOT EXISTS event_entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'shortlisted',
    notes TEXT,
    outreach_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, entity_id)
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name);
CREATE INDEX IF NOT EXISTS idx_entities_tags ON entities USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_entities_metadata ON entities USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_entities_city ON entities(city);
CREATE INDEX IF NOT EXISTS idx_event_entities_event ON event_entities(event_id);
CREATE INDEX IF NOT EXISTS idx_event_entities_entity ON event_entities(entity_id);

-- ============================================================================
-- RLS: Open access (no auth)
-- ============================================================================

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_entities ENABLE ROW LEVEL SECURITY;

-- Drop any existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own events" ON events;
DROP POLICY IF EXISTS "Users can insert their own events" ON events;
DROP POLICY IF EXISTS "Users can update their own events" ON events;
DROP POLICY IF EXISTS "Users can delete their own events" ON events;
DROP POLICY IF EXISTS "Anyone can view entities" ON entities;
DROP POLICY IF EXISTS "Authenticated users can insert entities" ON entities;
DROP POLICY IF EXISTS "Authenticated users can update entities" ON entities;
DROP POLICY IF EXISTS "Users can view their event entities" ON event_entities;
DROP POLICY IF EXISTS "Users can insert event entities" ON event_entities;
DROP POLICY IF EXISTS "Users can update event entities" ON event_entities;
DROP POLICY IF EXISTS "Users can delete event entities" ON event_entities;
DROP POLICY IF EXISTS "Users can manage their event entities" ON event_entities;

-- Open policies (no auth required)
CREATE POLICY "Open read events" ON events FOR SELECT USING (true);
CREATE POLICY "Open insert events" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "Open update events" ON events FOR UPDATE USING (true);
CREATE POLICY "Open delete events" ON events FOR DELETE USING (true);

CREATE POLICY "Open read entities" ON entities FOR SELECT USING (true);
CREATE POLICY "Open insert entities" ON entities FOR INSERT WITH CHECK (true);
CREATE POLICY "Open update entities" ON entities FOR UPDATE USING (true);
CREATE POLICY "Open delete entities" ON entities FOR DELETE USING (true);

CREATE POLICY "Open read event_entities" ON event_entities FOR SELECT USING (true);
CREATE POLICY "Open insert event_entities" ON event_entities FOR INSERT WITH CHECK (true);
CREATE POLICY "Open update event_entities" ON event_entities FOR UPDATE USING (true);
CREATE POLICY "Open delete event_entities" ON event_entities FOR DELETE USING (true);

-- ============================================================================
-- Triggers
-- ============================================================================

DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_entities_updated_at ON entities;
CREATE TRIGGER update_entities_updated_at
    BEFORE UPDATE ON entities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_event_entities_updated_at ON event_entities;
CREATE TRIGGER update_event_entities_updated_at
    BEFORE UPDATE ON event_entities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
