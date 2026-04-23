ALTER TABLE `items` ADD COLUMN `retired_at` text;

CREATE TABLE IF NOT EXISTS `artifact_lineage` (
  `artifact_id` text PRIMARY KEY NOT NULL REFERENCES items(id),
  `parent_artifact_id` text REFERENCES items(id),
  `source` text NOT NULL DEFAULT 'generated',
  `generation_mode` text NOT NULL,
  `generated_for_skill_id` text,
  `generated_for_track_id` text,
  `generator_version` text NOT NULL,
  `prompt_version` text,
  `metadata` text,
  `created_at` text NOT NULL
);

CREATE TABLE IF NOT EXISTS `selection_events` (
  `id` text PRIMARY KEY NOT NULL,
  `session_id` text REFERENCES sessions(id),
  `attempt_id` text REFERENCES attempts(id),
  `learnspace_id` text NOT NULL REFERENCES learnspaces(id),
  `user_id` text NOT NULL REFERENCES users(id),
  `track_id` text,
  `artifact_id` text NOT NULL REFERENCES items(id),
  `scheduler_ids` text,
  `candidate_snapshot` text,
  `selected_reason` text,
  `created_at` text NOT NULL
);

INSERT OR IGNORE INTO `artifact_lineage` (
  `artifact_id`,
  `parent_artifact_id`,
  `source`,
  `generation_mode`,
  `generated_for_skill_id`,
  `generated_for_track_id`,
  `generator_version`,
  `prompt_version`,
  `metadata`,
  `created_at`
)
SELECT
  gen_item.`id`,
  CASE
    WHEN gen_item.`parent_item_id` IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM `items` parent
        WHERE parent.`id` = gen_item.`parent_item_id`
      )
    THEN gen_item.`parent_item_id`
    ELSE NULL
  END,
  gen_item.`source`,
  'variant',
  json_extract(gen_item.`skill_ids`, '$[0]'),
  NULL,
  'variant-generator:v1',
  NULL,
  json_object('backfilled', 1, 'legacyParentItemId', gen_item.`parent_item_id`),
  gen_item.`created_at`
FROM `items` gen_item
WHERE gen_item.`source` = 'generated';

INSERT OR IGNORE INTO `selection_events` (
  `id`,
  `session_id`,
  `attempt_id`,
  `learnspace_id`,
  `user_id`,
  `track_id`,
  `artifact_id`,
  `scheduler_ids`,
  `candidate_snapshot`,
  `selected_reason`,
  `created_at`
)
SELECT
  'selection-' || attempt_row.`id`,
  attempt_row.`session_id`,
  attempt_row.`id`,
  attempt_row.`learnspace_id`,
  attempt_row.`user_id`,
  json_extract(attempt_row.`selection_context`, '$.trackId'),
  attempt_row.`item_id`,
  json_extract(attempt_row.`selection_context`, '$.selectionReason.schedulerIds'),
  json_object(
    'backfilled', 1,
    'artifactId', attempt_row.`item_id`,
    'item', json_extract(attempt_row.`selection_context`, '$.item')
  ),
  json_extract(attempt_row.`selection_context`, '$.selectionReason'),
  attempt_row.`started_at`
FROM `attempts` attempt_row
WHERE attempt_row.`selection_context` IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM `items` artifact
    WHERE artifact.`id` = attempt_row.`item_id`
  );
