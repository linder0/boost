-- Migration: Add CAMIS index for NYC Open Data restaurant deduplication
-- CAMIS is the unique NYC restaurant identifier from DOHMH

-- Create index on metadata->>'camis' for fast lookups during bulk import
CREATE INDEX IF NOT EXISTS idx_entities_metadata_camis
ON entities ((metadata->>'camis'))
WHERE metadata->>'camis' IS NOT NULL;

-- Create index on metadata->>'discovery_source' for filtering by source
CREATE INDEX IF NOT EXISTS idx_entities_metadata_discovery_source
ON entities ((metadata->>'discovery_source'))
WHERE metadata->>'discovery_source' IS NOT NULL;

-- Add comment for documentation
COMMENT ON INDEX idx_entities_metadata_camis IS
'Index for NYC CAMIS ID lookups during bulk import deduplication';

COMMENT ON INDEX idx_entities_metadata_discovery_source IS
'Index for filtering entities by discovery source (nyc_open_data, google_places, etc)';
