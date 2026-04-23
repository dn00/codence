ALTER TABLE `learnspaces` ADD COLUMN `active_track_id` text;
ALTER TABLE `sessions` ADD COLUMN `selection_context` text;
ALTER TABLE `attempts` ADD COLUMN `selection_context` text;

CREATE TABLE IF NOT EXISTS `tracks` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES users(id),
  `learnspace_id` text NOT NULL REFERENCES learnspaces(id),
  `slug` text NOT NULL,
  `name` text NOT NULL,
  `goal` text NOT NULL,
  `intent` text,
  `plan` text,
  `is_system` integer NOT NULL DEFAULT 0,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
