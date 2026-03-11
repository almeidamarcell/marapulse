CREATE TABLE `content_items` (
	`id` text PRIMARY KEY NOT NULL,
	`board_id` text NOT NULL,
	`external_id` text NOT NULL,
	`label` text,
	`url` text,
	`upvote_count` integer DEFAULT 0 NOT NULL,
	`downvote_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_items_board_external_idx` ON `content_items` (`board_id`,`external_id`);--> statement-breakpoint
CREATE TABLE `content_votes` (
	`id` text PRIMARY KEY NOT NULL,
	`content_item_id` text NOT NULL,
	`author_id` text NOT NULL,
	`value` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`content_item_id`) REFERENCES `content_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_votes_item_author_idx` ON `content_votes` (`content_item_id`,`author_id`);--> statement-breakpoint
CREATE INDEX `content_votes_item_idx` ON `content_votes` (`content_item_id`);