-- Migration: Restaurant Focus
-- Adds restaurant-specific fields for VROOM Select

-- Add restaurant-specific fields
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS cuisine TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS private_dining_capacity_min INTEGER;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS private_dining_capacity_max INTEGER;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS private_dining_minimum INTEGER;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS resy_venue_id TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS opentable_id TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS beli_rank INTEGER;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS has_private_dining BOOLEAN DEFAULT false;

-- Index for Resy deduplication
CREATE INDEX IF NOT EXISTS idx_vendors_resy_venue_id ON vendors(resy_venue_id);

-- Index for OpenTable deduplication
CREATE INDEX IF NOT EXISTS idx_vendors_opentable_id ON vendors(opentable_id);

-- Add comment for documentation
COMMENT ON COLUMN vendors.cuisine IS 'Restaurant cuisine type (e.g., Italian, Japanese, American)';
COMMENT ON COLUMN vendors.private_dining_capacity_min IS 'Minimum guests for private dining';
COMMENT ON COLUMN vendors.private_dining_capacity_max IS 'Maximum guests for private dining';
COMMENT ON COLUMN vendors.private_dining_minimum IS 'Minimum spend required for private dining';
COMMENT ON COLUMN vendors.resy_venue_id IS 'Resy venue ID for availability checking';
COMMENT ON COLUMN vendors.opentable_id IS 'OpenTable restaurant ID';
COMMENT ON COLUMN vendors.beli_rank IS 'Beli crowdsourced ranking score';
COMMENT ON COLUMN vendors.has_private_dining IS 'Whether restaurant offers private dining';
