-- Migration: Vendor Discovery Metadata
-- Adds discovery metadata fields to vendors table and prevents duplicates

-- Add discovery metadata fields to vendors table
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1),
ADD COLUMN IF NOT EXISTS email_confidence INTEGER,
ADD COLUMN IF NOT EXISTS google_place_id TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS discovery_source TEXT DEFAULT 'manual';

-- Clean up existing duplicates before adding unique constraint
-- Keep the first (oldest) vendor for each event_id + email combination
-- Delete the duplicates (newer entries with same email)
DELETE FROM vendors
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY event_id, LOWER(contact_email)
                   ORDER BY created_at ASC
               ) as row_num
        FROM vendors
    ) duplicates
    WHERE row_num > 1
);

-- Add unique constraint to prevent duplicate vendors per event
-- Using contact_email as the deduplication key (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendors_event_email_unique 
ON vendors(event_id, LOWER(contact_email));

-- Add index for google_place_id lookups (for deduplication)
CREATE INDEX IF NOT EXISTS idx_vendors_google_place_id
ON vendors(google_place_id) WHERE google_place_id IS NOT NULL;

-- Comments on new columns
COMMENT ON COLUMN vendors.website IS 'Vendor website URL from discovery';
COMMENT ON COLUMN vendors.rating IS 'Google Places rating (0-5)';
COMMENT ON COLUMN vendors.email_confidence IS 'Hunter.io email confidence score (0-100)';
COMMENT ON COLUMN vendors.google_place_id IS 'Google Places ID for deduplication';
COMMENT ON COLUMN vendors.phone IS 'Phone number from discovery';
COMMENT ON COLUMN vendors.discovery_source IS 'Source of vendor: google_places, manual, csv, demo';
