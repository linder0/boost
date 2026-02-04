-- Migration: VRM Simplify
-- Consolidates database to minimal VRM (Vendor Relationship Manager) structure
-- Entities become universal, threads/messages deferred for later

-- ============================================================================
-- Step 1: Create new entities table (universal VRM)
-- ============================================================================

CREATE TABLE IF NOT EXISTS entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Core fields (always present)
    name TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    location TEXT,
    description TEXT,
    website TEXT,
    popularity FLOAT,

    -- Flexible metadata for everything else
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name);
CREATE INDEX IF NOT EXISTS idx_entities_tags ON entities USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_entities_metadata ON entities USING GIN(metadata);

-- ============================================================================
-- Step 2: Create event_entities junction table
-- ============================================================================

CREATE TABLE IF NOT EXISTS event_entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,

    -- Event-specific status
    status TEXT DEFAULT 'discovered',
    notes TEXT,
    outreach_approved BOOLEAN DEFAULT false,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Prevent duplicates
    UNIQUE(event_id, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_event_entities_event ON event_entities(event_id);
CREATE INDEX IF NOT EXISTS idx_event_entities_entity ON event_entities(entity_id);

-- ============================================================================
-- Step 3: Simplify events table (add chat_history JSONB)
-- ============================================================================

ALTER TABLE events ADD COLUMN IF NOT EXISTS chat_history JSONB DEFAULT '[]';
ALTER TABLE events ADD COLUMN IF NOT EXISTS description TEXT;

-- ============================================================================
-- Step 4: Create simplified activity_log table
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID REFERENCES entities(id) ON DELETE SET NULL,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_event ON activity_log(event_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at);

-- ============================================================================
-- Step 5: Migrate existing vendor data to entities
-- ============================================================================

INSERT INTO entities (id, name, tags, location, description, website, popularity, metadata, created_at, updated_at)
SELECT
    id,
    name,
    ARRAY[category]::TEXT[],
    COALESCE(address, ''),
    NULL,
    website,
    COALESCE(rating, 0) * LN(GREATEST(1, COALESCE((metadata->>'review_count')::int, 1))),
    jsonb_build_object(
        'email', contact_email,
        'phone', phone,
        'latitude', latitude,
        'longitude', longitude,
        'cuisine', cuisine,
        'google_place_id', google_place_id,
        'resy_venue_id', resy_venue_id,
        'opentable_id', opentable_id,
        'beli_rank', beli_rank,
        'has_private_dining', has_private_dining,
        'private_dining_capacity_min', private_dining_capacity_min,
        'private_dining_capacity_max', private_dining_capacity_max,
        'private_dining_minimum', private_dining_minimum,
        'discovery_source', discovery_source,
        'rating', rating,
        'email_confidence', email_confidence
    ),
    created_at,
    updated_at
FROM vendors
ON CONFLICT (id) DO NOTHING;

-- Migrate vendor-event relationships to event_entities
INSERT INTO event_entities (event_id, entity_id, status, created_at, updated_at)
SELECT
    v.event_id,
    v.id,
    COALESCE(vt.status::text, 'discovered'),
    v.created_at,
    v.updated_at
FROM vendors v
LEFT JOIN vendor_threads vt ON vt.vendor_id = v.id
ON CONFLICT (event_id, entity_id) DO NOTHING;

-- Migrate chat_messages to events.chat_history
UPDATE events e
SET chat_history = COALESCE((
    SELECT jsonb_agg(
        jsonb_build_object(
            'role', cm.role,
            'content', cm.content,
            'created_at', cm.created_at
        ) ORDER BY cm.created_at
    )
    FROM chat_messages cm
    WHERE cm.event_id = e.id
), '[]'::jsonb);

-- ============================================================================
-- Step 6: Enable RLS on new tables
-- ============================================================================

ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Entities: Public read, authenticated write
CREATE POLICY "Anyone can view entities"
    ON entities FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can insert entities"
    ON entities FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update entities"
    ON entities FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Event entities: Based on event ownership
CREATE POLICY "Users can view their event entities"
    ON event_entities FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id = event_entities.event_id
            AND events.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their event entities"
    ON event_entities FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id = event_entities.event_id
            AND events.user_id = auth.uid()
        )
    );

-- Activity log: Based on event ownership
CREATE POLICY "Users can view their activity logs"
    ON activity_log FOR SELECT
    USING (
        event_id IS NULL OR
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id = activity_log.event_id
            AND events.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert activity logs"
    ON activity_log FOR INSERT
    WITH CHECK (
        event_id IS NULL OR
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id = activity_log.event_id
            AND events.user_id = auth.uid()
        )
    );

-- ============================================================================
-- Step 7: Add updated_at triggers
-- ============================================================================

CREATE TRIGGER update_entities_updated_at BEFORE UPDATE ON entities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_entities_updated_at BEFORE UPDATE ON event_entities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Note: Old tables (vendors, vendor_threads, messages, parsed_responses,
-- decisions, automation_logs, chat_messages, user_profiles) are NOT dropped.
-- They remain for reference and can be dropped in a future migration once
-- the new schema is verified working.
-- ============================================================================
