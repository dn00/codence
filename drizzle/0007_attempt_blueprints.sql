ALTER TABLE sessions ADD COLUMN blueprint_id TEXT;
ALTER TABLE sessions ADD COLUMN blueprint_version INTEGER;
ALTER TABLE sessions ADD COLUMN blueprint_snapshot TEXT;

ALTER TABLE attempts ADD COLUMN blueprint_id TEXT;
ALTER TABLE attempts ADD COLUMN blueprint_version INTEGER;
ALTER TABLE attempts ADD COLUMN blueprint_snapshot TEXT;
