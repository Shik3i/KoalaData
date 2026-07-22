ALTER TABLE `projects` ADD `pricing_model` text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `is_open_source` integer DEFAULT 0 NOT NULL;