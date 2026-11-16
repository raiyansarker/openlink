CREATE TABLE `link_click` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`link_id` text NOT NULL,
	`domain_id` text,
	`occurred_at` integer NOT NULL,
	`visitor_hash` text NOT NULL,
	`channel` text NOT NULL,
	`referrer_host` text,
	`country` text,
	`city` text,
	`latitude` real,
	`longitude` real,
	`device` text NOT NULL,
	`browser` text NOT NULL,
	`os` text NOT NULL,
	`delivery` text NOT NULL,
	`destination_host` text,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`link_id`) REFERENCES `link`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `link_click_org_time_idx` ON `link_click` (`organization_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `link_click_link_time_idx` ON `link_click` (`link_id`,`occurred_at`);