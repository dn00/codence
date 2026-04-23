-- Add coach runtime state column to sessions (for existing databases).
-- New databases already have this column from 0000_initial.sql.
-- ALTER TABLE ADD COLUMN is idempotent via error handling in db.ts.

ALTER TABLE sessions ADD COLUMN coach_runtime_state TEXT;
