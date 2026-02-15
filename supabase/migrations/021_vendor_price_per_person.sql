-- Add price_per_person column to vendors table
-- Stored as TEXT because values are free-form (e.g. "$120-$200 per person")
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS price_per_person TEXT;
