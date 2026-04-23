ALTER TABLE attempts ADD COLUMN model_outcome TEXT;
ALTER TABLE attempts ADD COLUMN applied_overrides TEXT;
ALTER TABLE attempts ADD COLUMN evaluation_source TEXT;
ALTER TABLE attempts ADD COLUMN retry_recovered INTEGER;
ALTER TABLE attempts ADD COLUMN stub_reason TEXT;
