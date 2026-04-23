ALTER TABLE `tracks` ADD COLUMN `source` text DEFAULT 'system_template';
ALTER TABLE `tracks` ADD COLUMN `status` text DEFAULT 'active';
ALTER TABLE `tracks` ADD COLUMN `spec` text;
ALTER TABLE `tracks` ADD COLUMN `program` text;

CREATE TABLE IF NOT EXISTS `track_runtime_state` (
  `track_id` text PRIMARY KEY NOT NULL,
  `learnspace_id` text NOT NULL REFERENCES learnspaces(id),
  `user_id` text NOT NULL REFERENCES users(id),
  `state` text NOT NULL,
  `updated_at` text NOT NULL
);

CREATE TABLE IF NOT EXISTS `track_transition_events` (
  `id` text PRIMARY KEY NOT NULL,
  `track_id` text NOT NULL REFERENCES tracks(id),
  `learnspace_id` text NOT NULL REFERENCES learnspaces(id),
  `user_id` text NOT NULL REFERENCES users(id),
  `event` text NOT NULL,
  `created_at` text NOT NULL
);

CREATE TABLE IF NOT EXISTS `planner_decision_events` (
  `id` text PRIMARY KEY NOT NULL,
  `track_id` text NOT NULL REFERENCES tracks(id),
  `learnspace_id` text NOT NULL REFERENCES learnspaces(id),
  `user_id` text NOT NULL REFERENCES users(id),
  `session_id` text REFERENCES sessions(id),
  `event` text NOT NULL,
  `created_at` text NOT NULL
);

CREATE TABLE IF NOT EXISTS `evidence_records` (
  `id` text PRIMARY KEY NOT NULL,
  `track_id` text REFERENCES tracks(id),
  `learnspace_id` text NOT NULL REFERENCES learnspaces(id),
  `user_id` text NOT NULL REFERENCES users(id),
  `artifact_id` text REFERENCES items(id),
  `session_id` text REFERENCES sessions(id),
  `attempt_id` text REFERENCES attempts(id),
  `evidence` text NOT NULL,
  `created_at` text NOT NULL
);
