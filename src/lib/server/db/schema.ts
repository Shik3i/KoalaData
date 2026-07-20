import { sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

// Users
export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	username: text('username').notNull().unique(),
	normalizedUsername: text('normalized_username').notNull().unique(),
	// Compatibility column; migration triggers enforce display_name === username.
	displayName: text('display_name').notNull(),
	passwordHash: text('password_hash').notNull(),
	role: text('role', { enum: ['user', 'admin'] }).notNull().default('user'),
	status: text('status', { enum: ['pending', 'active', 'rejected', 'banned', 'deleted'] }).notNull().default('pending'),
	forcePasswordChange: integer('force_password_change').notNull().default(0), // 0=false, 1=true
	createdAt: integer('created_at').notNull(),
	updatedAt: integer('updated_at').notNull(),
	deletedAt: integer('deleted_at')
}, (table) => ({
	normUserIdx: uniqueIndex('idx_users_norm_username').on(table.normalizedUsername)
}));

// Sessions
export const sessions = sqliteTable('sessions', {
	id: text('id').primaryKey(), // SHA-256 hash of the session token
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: integer('expires_at').notNull(),
	createdAt: integer('created_at').notNull(),
	lastUsedAt: integer('last_used_at').notNull(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent')
});

// System Settings
export const systemSettings = sqliteTable('system_settings', {
	key: text('key').primaryKey(),
	value: text('value').notNull()
});

// User Limit Overrides
export const userLimitOverrides = sqliteTable('user_limit_overrides', {
	userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
	maxProjects: integer('max_projects'),
	maxStorageBytes: integer('max_storage_bytes'),
	maxCsvSizeBytes: integer('max_csv_size_bytes'),
	maxCsvRows: integer('max_csv_rows')
});

// Projects
export const projects = sqliteTable('projects', {
	id: text('id').primaryKey(),
	ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
	name: text('name').notNull(),
	slug: text('slug').notNull().unique(),
	shortDescription: text('short_description').notNull(),
	fullDescription: text('full_description').notNull(),
	websiteUrl: text('website_url'),
	repositoryUrl: text('repository_url'),
	storeUrl: text('store_url'),
	category: text('category', { enum: ['productivity', 'entertainment', 'developer-tools', 'accessibility', 'privacy', 'social', 'shopping', 'education', 'other'] }).notNull(),
	logoPath: text('logo_path'),
	accentColor: text('accent_color'),
	visibility: text('visibility', { enum: ['public', 'unlisted', 'private'] }).notNull(),
	leaderboardOptIn: integer('leaderboard_opt_in').notNull().default(0), // 0=false, 1=true
	leaderboardStatus: text('leaderboard_status', { enum: ['not_requested', 'pending', 'approved', 'rejected', 'excluded'] }).notNull().default('not_requested'),
	verificationStatus: text('verification_status', { enum: ['unverified', 'verified'] }).notNull().default('unverified'),
	moderationStatus: text('moderation_status', { enum: ['active', 'hidden', 'banned'] }).notNull().default('active'),
	moderationReason: text('moderation_reason'),
	moderatedAt: integer('moderated_at'),
	moderatedBy: text('moderated_by').references(() => users.id, { onDelete: 'set null' }),
	createdAt: integer('created_at').notNull(),
	updatedAt: integer('updated_at').notNull(),
	deletedAt: integer('deleted_at')
}, (table) => ({
	slugIdx: uniqueIndex('idx_projects_slug').on(table.slug),
	discoverIdx: index('idx_projects_discover').on(table.visibility, table.deletedAt, table.moderationStatus)
}));

// Project Slug Redirects
export const projectSlugRedirects = sqliteTable('project_slug_redirects', {
	oldSlug: text('old_slug').primaryKey(),
	newSlug: text('new_slug').notNull(),
	projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' })
});

// Project Members (only editors - owners derived from projects.ownerId)
export const projectMembers = sqliteTable('project_members', {
	id: text('id').primaryKey(),
	projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	role: text('role', { enum: ['editor'] }).notNull().default('editor'),
	createdAt: integer('created_at').notNull()
}, (table) => ({
	projUserUnq: uniqueIndex('idx_project_members_unq').on(table.projectId, table.userId)
}));

// Data Sources
export const dataSources = sqliteTable('data_sources', {
	id: text('id').primaryKey(),
	projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	sourceType: text('source_type', { enum: ['chrome_web_store', 'generic_csv'] }).notNull(),
	externalUrl: text('external_url'),
	granularity: text('granularity', { enum: ['daily', 'weekly', 'monthly', 'irregular'] }).notNull(),
	createdAt: integer('created_at').notNull(),
	updatedAt: integer('updated_at').notNull()
});

// Metric Definitions
export const metricDefinitions = sqliteTable('metric_definitions', {
	id: text('id').primaryKey(),
	sourceId: text('source_id').notNull().references(() => dataSources.id, { onDelete: 'cascade' }),
	metricType: text('metric_type', { enum: ['active_users', 'installs', 'uninstalls', 'net_growth', 'store_impressions', 'store_page_views', 'downloads', 'custom'] }).notNull(),
	name: text('name').notNull(),
	unit: text('unit', { enum: ['count', 'percentage', 'custom'] }).notNull(),
	aggregation: text('aggregation', { enum: ['latest', 'sum', 'average', 'minimum', 'maximum'] }).notNull(),
	isCumulative: integer('is_cumulative').notNull().default(0), // 0=false, 1=true
	participatesInLeaderboard: integer('participates_in_leaderboard').notNull().default(0), // 0=false, 1=true
	createdAt: integer('created_at').notNull()
}, (table) => ({
	sourceTypeMetricNameUnq: uniqueIndex('idx_metric_defs_unq').on(table.sourceId, table.metricType, table.name)
}));

// Import Drafts
export const importDrafts = sqliteTable('import_drafts', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
	sourceId: text('source_id').notNull().references(() => dataSources.id, { onDelete: 'cascade' }),
	storedFilename: text('stored_filename').notNull(),
	detectedDelimiter: text('detected_delimiter').notNull(),
	detectedEncoding: text('detected_encoding').notNull(),
	headers: text('headers').notNull(), // JSON array
	rowCount: integer('row_count').notNull(),
	createdAt: integer('created_at').notNull(),
	expiresAt: integer('expires_at').notNull()
});

// Import Batches
export const importBatches = sqliteTable('import_batches', {
	id: text('id').primaryKey(),
	projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
	sourceId: text('source_id').notNull().references(() => dataSources.id, { onDelete: 'cascade' }),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
	originalFilename: text('original_filename').notNull(),
	storedFilename: text('stored_filename'), // Nullable if deleted
	fileSize: integer('file_size').notNull(),
	checksum: text('checksum').notNull(),
	detectedImporter: text('detected_importer').notNull(),
	mappingConfig: text('mapping_config').notNull(), // JSON
	rowCount: integer('row_count').notNull(),
	warningCount: integer('warning_count').notNull().default(0),
	errorCount: integer('error_count').notNull().default(0),
	startDate: text('start_date'), // YYYY-MM-DD
	endDate: text('end_date'), // YYYY-MM-DD
	status: text('status', { enum: ['processing', 'completed', 'failed', 'reverted'] }).notNull().default('processing'),
	errorMessage: text('error_message'),
	createdAt: integer('created_at').notNull(),
	completedAt: integer('completed_at'),
	revertedAt: integer('reverted_at'),
	revertedBy: text('reverted_by').references(() => users.id, { onDelete: 'restrict' }),
	duplicateCount: integer('duplicate_count').notNull().default(0),
	overlapCount: integer('overlap_count').notNull().default(0),
	rawFileDeletedAt: integer('raw_file_deleted_at')
});

// Metric Observations
export const metricObservations = sqliteTable('metric_observations', {
	id: text('id').primaryKey(),
	importBatchId: text('import_batch_id').notNull().references(() => importBatches.id, { onDelete: 'cascade' }),
	sourceId: text('source_id').notNull().references(() => dataSources.id, { onDelete: 'cascade' }),
	metricId: text('metric_id').notNull().references(() => metricDefinitions.id, { onDelete: 'cascade' }),
	date: text('date').notNull(), // ISO YYYY-MM-DD
	value: real('value').notNull(),
	dimensions: text('dimensions').notNull().default('{}'), // Alphabetically sorted stringified JSON
	createdAt: integer('created_at').notNull()
}, (table) => ({
	batchMetricDateDimUnq: uniqueIndex('idx_obs_batch_metric_date_dim').on(table.importBatchId, table.metricId, table.date, table.dimensions),
	lookupIdx: index('idx_obs_lookup').on(table.sourceId, table.metricId, table.date)
}));

// Audit Logs
export const auditLogs = sqliteTable('audit_logs', {
	id: text('id').primaryKey(),
	actorId: text('actor_id').references(() => users.id, { onDelete: 'set null' }),
	actorUsername: text('actor_username').notNull(),
	action: text('action').notNull(),
	targetType: text('target_type').notNull(),
	targetId: text('target_id').notNull(),
	timestamp: integer('timestamp').notNull(),
	metadata: text('metadata'), // JSON string
	ipAddress: text('ip_address'),
	userAgent: text('user_agent')
});

// Rate Limit Records
export const rateLimitRecords = sqliteTable('rate_limit_records', {
	key: text('key').primaryKey(),
	tokens: real('tokens').notNull(),
	lastUpdated: integer('last_updated').notNull()
});
