-- Rebuilding `link` drops the old table. Where foreign keys are enforced (always
-- on D1, which ignores `PRAGMA foreign_keys=OFF`), that cascades and would delete
-- every link comment, so comments are copied aside and restored afterwards.
PRAGMA defer_foreign_keys = true;--> statement-breakpoint
CREATE TABLE `__link_comment_backup` AS SELECT * FROM `link_comment`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_link` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`domain_id` text,
	`folder_id` text,
	`slug` text NOT NULL,
	`alias` text,
	`title` text,
	`description` text,
	`destination_url` text NOT NULL,
	`redirect_status` integer DEFAULT 302 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`activate_at` integer,
	`expires_at` integer,
	`max_clicks` integer,
	`click_count` integer DEFAULT 0 NOT NULL,
	`password_hash` text,
	`expired_destination_url` text,
	`fallback_destination_url` text,
	`tags_json` text DEFAULT '[]' NOT NULL,
	`utm_json` text,
	`metadata_json` text,
	`created_by_user_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`domain_id`) REFERENCES `custom_domain`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`folder_id`) REFERENCES `link_folder`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_link`("id", "organization_id", "domain_id", "folder_id", "slug", "alias", "title", "description", "destination_url", "redirect_status", "status", "enabled", "activate_at", "expires_at", "max_clicks", "click_count", "password_hash", "expired_destination_url", "fallback_destination_url", "tags_json", "utm_json", "metadata_json", "created_by_user_id", "created_at", "updated_at") SELECT "id", "organization_id", "domain_id", "folder_id", "slug", "alias", "title", "description", "destination_url", "redirect_status", "status", "enabled", "activate_at", "expires_at", "max_clicks", "click_count", "password_hash", "expired_destination_url", "fallback_destination_url", "tags_json", "utm_json", "metadata_json", "created_by_user_id", "created_at", "updated_at" FROM `link`;--> statement-breakpoint
DROP TABLE `link`;--> statement-breakpoint
ALTER TABLE `__new_link` RENAME TO `link`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `link_domain_slug_unique` ON `link` (`domain_id`,`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `link_default_slug_unique` ON `link` (`slug`) WHERE "link"."domain_id" IS NULL;--> statement-breakpoint
CREATE INDEX `link_org_idx` ON `link` (`organization_id`);--> statement-breakpoint
CREATE INDEX `link_folder_idx` ON `link` (`folder_id`);--> statement-breakpoint
INSERT INTO `link_comment` SELECT * FROM `__link_comment_backup` WHERE `id` NOT IN (SELECT `id` FROM `link_comment`);--> statement-breakpoint
DROP TABLE `__link_comment_backup`;
