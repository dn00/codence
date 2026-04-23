-- Add slug (stable identifier) and status (active/retired) to items
ALTER TABLE items ADD COLUMN slug TEXT;
ALTER TABLE items ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

-- Backfill slugs for existing seed items from their id (strip 'seed-' prefix)
UPDATE items SET slug = REPLACE(id, 'seed-', '') WHERE source = 'seed' AND slug IS NULL;
