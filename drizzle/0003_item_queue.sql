CREATE TABLE IF NOT EXISTS `item_queue` (
  `id` text PRIMARY KEY NOT NULL,
  `learnspace_id` text NOT NULL,
  `user_id` text NOT NULL,
  `item_id` text NOT NULL,
  `skill_id` text NOT NULL,
  `interval_days` real NOT NULL DEFAULT 1,
  `ease_factor` real NOT NULL DEFAULT 2.5,
  `round` integer NOT NULL DEFAULT 0,
  `due_date` text,
  `last_outcome` text,
  `skip_count` integer NOT NULL DEFAULT 0,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
