-- Add location fields to events and vendors tables for Mapbox integration

-- Events: add precise location coordinates and address
ALTER TABLE events 
  ADD COLUMN location_address TEXT,
  ADD COLUMN location_lat DOUBLE PRECISION,
  ADD COLUMN location_lng DOUBLE PRECISION;

-- Vendors: add location fields
ALTER TABLE vendors
  ADD COLUMN address TEXT,
  ADD COLUMN latitude DOUBLE PRECISION,
  ADD COLUMN longitude DOUBLE PRECISION;

-- Index for geospatial queries on vendors
CREATE INDEX idx_vendors_location ON vendors(latitude, longitude) 
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Index for geospatial queries on events
CREATE INDEX idx_events_location ON events(location_lat, location_lng)
  WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL;
