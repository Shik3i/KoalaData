CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text,
	`actor_username` text NOT NULL,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`timestamp` integer NOT NULL,
	`metadata` text,
	`ip_address` text,
	`user_agent` text,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `data_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`source_type` text NOT NULL,
	`external_url` text,
	`granularity` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `import_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`source_id` text NOT NULL,
	`user_id` text NOT NULL,
	`original_filename` text NOT NULL,
	`stored_filename` text,
	`file_size` integer NOT NULL,
	`checksum` text NOT NULL,
	`detected_importer` text NOT NULL,
	`mapping_config` text NOT NULL,
	`row_count` integer NOT NULL,
	`warning_count` integer DEFAULT 0 NOT NULL,
	`error_count` integer DEFAULT 0 NOT NULL,
	`start_date` text,
	`end_date` text,
	`status` text DEFAULT 'processing' NOT NULL,
	`error_message` text,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	`reverted_at` integer,
	`reverted_by` text,
	`duplicate_count` integer DEFAULT 0 NOT NULL,
	`overlap_count` integer DEFAULT 0 NOT NULL,
	`raw_file_deleted_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_id`) REFERENCES `data_sources`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`reverted_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `import_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`project_id` text NOT NULL,
	`source_id` text NOT NULL,
	`stored_filename` text NOT NULL,
	`detected_delimiter` text NOT NULL,
	`detected_encoding` text NOT NULL,
	`headers` text NOT NULL,
	`row_count` integer NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_id`) REFERENCES `data_sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `metric_definitions` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`metric_type` text NOT NULL,
	`name` text NOT NULL,
	`unit` text NOT NULL,
	`aggregation` text NOT NULL,
	`is_cumulative` integer DEFAULT 0 NOT NULL,
	`participates_in_leaderboard` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `data_sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `metric_observations` (
	`id` text PRIMARY KEY NOT NULL,
	`import_batch_id` text NOT NULL,
	`source_id` text NOT NULL,
	`metric_id` text NOT NULL,
	`date` text NOT NULL,
	`value` real NOT NULL,
	`dimensions` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`import_batch_id`) REFERENCES `import_batches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_id`) REFERENCES `data_sources`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`metric_id`) REFERENCES `metric_definitions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_obs_batch_metric_date_dim` ON `metric_observations` (`import_batch_id`,`metric_id`,`date`,`dimensions`);--> statement-breakpoint
CREATE INDEX `idx_obs_lookup` ON `metric_observations` (`source_id`,`metric_id`,`date`);--> statement-breakpoint
CREATE TABLE `project_members` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'editor' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_project_members_unq` ON `project_members` (`project_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `project_slug_redirects` (
	`old_slug` text PRIMARY KEY NOT NULL,
	`new_slug` text NOT NULL,
	`project_id` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`short_description` text NOT NULL,
	`full_description` text NOT NULL,
	`website_url` text,
	`repository_url` text,
	`store_url` text,
	`category` text NOT NULL,
	`logo_path` text,
	`accent_color` text,
	`visibility` text NOT NULL,
	`leaderboard_opt_in` integer DEFAULT 0 NOT NULL,
	`leaderboard_status` text DEFAULT 'not_requested' NOT NULL,
	`verification_status` text DEFAULT 'unverified' NOT NULL,
	`moderation_status` text DEFAULT 'active' NOT NULL,
	`moderation_reason` text,
	`moderated_at` integer,
	`moderated_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`moderated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_slug_unique` ON `projects` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_projects_slug` ON `projects` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_projects_discover` ON `projects` (`visibility`,`deleted_at`,`moderation_status`);--> statement-breakpoint
CREATE TABLE `rate_limit_records` (
	`key` text PRIMARY KEY NOT NULL,
	`tokens` real NOT NULL,
	`last_updated` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`last_used_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_limit_overrides` (
	`user_id` text PRIMARY KEY NOT NULL,
	`max_projects` integer,
	`max_storage_bytes` integer,
	`max_csv_size_bytes` integer,
	`max_csv_rows` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`normalized_username` text NOT NULL,
	`display_name` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`force_password_change` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_normalized_username_unique` ON `users` (`normalized_username`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_norm_username` ON `users` (`normalized_username`);