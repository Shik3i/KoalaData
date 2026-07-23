CREATE TABLE `public_project_stats` (
	`project_id` text PRIMARY KEY NOT NULL,
	`active_users` real,
	`active_users_date` text,
	`installs` real,
	`installs_date` text,
	`rating` real,
	`rating_count` integer DEFAULT 0 NOT NULL,
	`last_data_date` text,
	`growth` real DEFAULT 0 NOT NULL,
	`growth_percent` real DEFAULT 0 NOT NULL,
	`refreshed_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_public_project_stats_growth` ON `public_project_stats` (`growth`);--> statement-breakpoint
WITH ranked_observations AS (
	SELECT p.id AS project_id, md.id AS metric_id, md.metric_type, o.date, o.value, o.dimensions,
		ROW_NUMBER() OVER (
			PARTITION BY md.id, o.date, o.dimensions
			ORDER BY b.completed_at DESC, o.id DESC
		) AS rn
	FROM projects p
	INNER JOIN data_sources ds ON ds.project_id = p.id
	INNER JOIN metric_definitions md ON md.source_id = ds.id
	INNER JOIN metric_observations o ON o.metric_id = md.id
	INNER JOIN import_batches b ON b.id = o.import_batch_id
	WHERE p.visibility = 'public'
	  AND p.deleted_at IS NULL
	  AND p.moderation_status = 'active'
	  AND md.metric_type IN ('active_users', 'installs', 'custom')
	  AND b.status = 'completed'
	  AND b.reverted_at IS NULL
), effective AS (
	SELECT project_id, metric_type, date, value
	FROM ranked_observations
	WHERE rn = 1
), latest_active AS (
	SELECT project_id, date, value,
		ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY date DESC) AS rn
	FROM effective
	WHERE metric_type = 'active_users'
), past_active AS (
	SELECT latest.project_id,
		COALESCE(
			(SELECT history.value FROM effective history
			 WHERE history.project_id = latest.project_id
			   AND history.metric_type = 'active_users'
			   AND history.date <= date(latest.date, '-30 days')
			 ORDER BY history.date DESC LIMIT 1),
			(SELECT history.value FROM effective history
			 WHERE history.project_id = latest.project_id
			   AND history.metric_type = 'active_users'
			 ORDER BY history.date ASC LIMIT 1),
			latest.value
		) AS value
	FROM latest_active latest
	WHERE latest.rn = 1
), latest_installs AS (
	SELECT project_id, date, value,
		ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY date DESC) AS rn
	FROM effective
	WHERE metric_type = 'installs'
), last_data AS (
	SELECT project_id, MAX(date) AS date
	FROM effective
	GROUP BY project_id
)
INSERT INTO public_project_stats (
	project_id, active_users, active_users_date, installs, installs_date,
	rating, rating_count, last_data_date, growth, growth_percent, refreshed_at
)
SELECT p.id,
	active.value,
	active.date,
	installs.value,
	installs.date,
	NULL,
	0,
	last_data.date,
	COALESCE(active.value - past.value, 0),
	CASE WHEN past.value >= 25 THEN ((active.value - past.value) / past.value) * 100 ELSE 0 END,
	CAST(strftime('%s', 'now') AS integer)
FROM projects p
LEFT JOIN latest_active active ON active.project_id = p.id AND active.rn = 1
LEFT JOIN past_active past ON past.project_id = p.id
LEFT JOIN latest_installs installs ON installs.project_id = p.id AND installs.rn = 1
LEFT JOIN last_data ON last_data.project_id = p.id
WHERE p.visibility = 'public'
  AND p.deleted_at IS NULL
  AND p.moderation_status = 'active';
