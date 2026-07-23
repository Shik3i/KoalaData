CREATE INDEX `idx_data_sources_project` ON `data_sources` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_import_batches_project_created` ON `import_batches` (`project_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_import_batches_source` ON `import_batches` (`source_id`);--> statement-breakpoint
CREATE INDEX `idx_import_batches_user_storage` ON `import_batches` (`user_id`,`raw_file_deleted_at`,`status`);--> statement-breakpoint
CREATE INDEX `idx_import_drafts_project_user` ON `import_drafts` (`project_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_import_drafts_expires` ON `import_drafts` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_obs_metric_date` ON `metric_observations` (`metric_id`,`date`);