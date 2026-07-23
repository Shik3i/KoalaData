CREATE INDEX `idx_audit_logs_timestamp` ON `audit_logs` (`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_actor` ON `audit_logs` (`actor_id`);--> statement-breakpoint
CREATE INDEX `idx_import_batches_created` ON `import_batches` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_project_members_user` ON `project_members` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_projects_owner` ON `projects` (`owner_id`,`deleted_at`);--> statement-breakpoint
CREATE INDEX `idx_rate_limit_records_updated` ON `rate_limit_records` (`last_updated`);--> statement-breakpoint
CREATE INDEX `idx_sessions_user` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_sessions_expires` ON `sessions` (`expires_at`);