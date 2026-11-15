CREATE TABLE `link_comment` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`link_id` text NOT NULL,
	`author_user_id` text,
	`author_label` text NOT NULL,
	`body` text NOT NULL,
	`reactions_json` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	`edited_at` integer,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`link_id`) REFERENCES `link`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `link_comment_link_idx` ON `link_comment` (`link_id`,`created_at`);