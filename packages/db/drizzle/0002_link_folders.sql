CREATE TABLE `link_folder` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`parent_id` text,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `link_folder`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `link_folder_org_idx` ON `link_folder` (`organization_id`,`parent_id`);--> statement-breakpoint
ALTER TABLE `link` ADD `folder_id` text REFERENCES link_folder(id) ON DELETE set null;--> statement-breakpoint
CREATE INDEX `link_folder_idx` ON `link` (`folder_id`);