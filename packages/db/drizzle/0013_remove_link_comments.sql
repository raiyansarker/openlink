-- Comments were removed in favour of a link's notes (the existing `description` column).
DROP TABLE `link_comment`;--> statement-breakpoint
DELETE FROM `activity_event` WHERE `action` = 'link.commented';
