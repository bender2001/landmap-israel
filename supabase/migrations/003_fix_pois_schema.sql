-- ═══════════════════════════════════════════
-- Fix POI Schema — add type & description
-- ═══════════════════════════════════════════

ALTER TABLE points_of_interest ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general';
ALTER TABLE points_of_interest ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE points_of_interest ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE points_of_interest ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

-- Backfill lat/lng from existing coordinates JSONB
UPDATE points_of_interest
SET lat = (coordinates->>'lat')::double precision,
    lng = (coordinates->>'lng')::double precision
WHERE lat IS NULL AND coordinates IS NOT NULL;
