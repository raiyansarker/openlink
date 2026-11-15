CREATE TABLE `activity_event` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`actor_type` text NOT NULL,
	`actor_user_id` text,
	`actor_label` text NOT NULL,
	`action` text NOT NULL,
	`category` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text,
	`target_label` text NOT NULL,
	`source` text DEFAULT 'dashboard' NOT NULL,
	`details_json` text,
	`ip_address` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `activity_org_created_idx` ON `activity_event` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `activity_target_idx` ON `activity_event` (`target_type`,`target_id`,`created_at`);