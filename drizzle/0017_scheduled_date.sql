-- Immutable scheduled-date column alongside smoothable due_date. Schedulers
-- that compute lateness (FSRS, deadline-anchored) read scheduled_date;
-- overdue-queue smoothing rewrites only due_date. Backfill mirrors existing
-- rows so historical math is consistent for upgrades.
ALTER TABLE `queue` ADD COLUMN `scheduled_date` TEXT;
UPDATE `queue` SET `scheduled_date` = `due_date` WHERE `due_date` IS NOT NULL;

ALTER TABLE `item_queue` ADD COLUMN `scheduled_date` TEXT;
UPDATE `item_queue` SET `scheduled_date` = `due_date` WHERE `due_date` IS NOT NULL;
