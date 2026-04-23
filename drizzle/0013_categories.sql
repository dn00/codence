CREATE TABLE `categories` (
  `id` text PRIMARY KEY NOT NULL,
  `learnspace_id` text NOT NULL,
  `label` text NOT NULL,
  `description` text,
  `created_at` text NOT NULL
);

ALTER TABLE `skills` ADD COLUMN `category_id` text;
