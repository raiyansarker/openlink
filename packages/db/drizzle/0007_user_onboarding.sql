ALTER TABLE `user` ADD `onboarded_at` integer;--> statement-breakpoint
-- Anyone who already belongs to a workspace has, in effect, been onboarded.
UPDATE `user` SET `onboarded_at` = `created_at`
WHERE `onboarded_at` IS NULL
  AND EXISTS (SELECT 1 FROM `organization_member` WHERE `organization_member`.`user_id` = `user`.`id`);
