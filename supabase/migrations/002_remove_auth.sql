-- Remove authentication and events from VRM
-- Add granular location fields to entities
-- This migration simplifies the schema to work without user authentication

-- ============================================================================
-- Drop event-related tables
-- ============================================================================

DROP TABLE IF EXISTS event_entities CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS gmail_tokens CASCADE;

-- ============================================================================
-- Drop related indexes (if they still exist after CASCADE)
-- ============================================================================

DROP INDEX IF EXISTS idx_events_user_id;
DROP INDEX IF EXISTS idx_event_entities_event;
DROP INDEX IF EXISTS idx_event_entities_entity;
DROP INDEX IF EXISTS idx_activity_log_event;

-- ============================================================================
-- Update activity_log to remove event reference
-- ============================================================================

ALTER TABLE activity_log DROP COLUMN IF EXISTS event_id;

-- ============================================================================
-- Add granular location columns to entities
-- ============================================================================

-- Full street address (e.g., "123 Main St, New York, NY 10001")
ALTER TABLE entities ADD COLUMN IF NOT EXISTS address TEXT;

-- Neighborhood (e.g., "Tribeca", "West Village", "Williamsburg")
ALTER TABLE entities ADD COLUMN IF NOT EXISTS neighborhood TEXT;

-- City (e.g., "New York", "Brooklyn")
ALTER TABLE entities ADD COLUMN IF NOT EXISTS city TEXT;

-- Coordinates for mapping
ALTER TABLE entities ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7);
ALTER TABLE entities ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7);

-- Create indexes for location-based queries
CREATE INDEX IF NOT EXISTS idx_entities_neighborhood ON entities(neighborhood);
CREATE INDEX IF NOT EXISTS idx_entities_city ON entities(city);
CREATE INDEX IF NOT EXISTS idx_entities_coords ON entities(latitude, longitude);

-- ============================================================================
-- Update entities RLS to allow anonymous access
-- ============================================================================

-- Drop ALL existing policies on entities
DROP POLICY IF EXISTS "Authenticated users can insert entities" ON entities;
DROP POLICY IF EXISTS "Authenticated users can update entities" ON entities;
DROP POLICY IF EXISTS "Anyone can view entities" ON entities;
DROP POLICY IF EXISTS "Anyone can insert entities" ON entities;
DROP POLICY IF EXISTS "Anyone can update entities" ON entities;
DROP POLICY IF EXISTS "Anyone can delete entities" ON entities;

-- Create public access policies
CREATE POLICY "Anyone can view entities"
    ON entities FOR SELECT USING (true);

CREATE POLICY "Anyone can insert entities"
    ON entities FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update entities"
    ON entities FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete entities"
    ON entities FOR DELETE USING (true);

-- ============================================================================
-- Update activity_log RLS for public access
-- ============================================================================

-- Drop ALL existing policies on activity_log
DROP POLICY IF EXISTS "Users can view their activity logs" ON activity_log;
DROP POLICY IF EXISTS "Users can insert activity logs" ON activity_log;
DROP POLICY IF EXISTS "Anyone can view activity logs" ON activity_log;
DROP POLICY IF EXISTS "Anyone can insert activity logs" ON activity_log;

-- Create public access policies
CREATE POLICY "Anyone can view activity logs"
    ON activity_log FOR SELECT USING (true);

CREATE POLICY "Anyone can insert activity logs"
    ON activity_log FOR INSERT WITH CHECK (true);
