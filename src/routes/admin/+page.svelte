<script lang="ts">
	let { data } = $props();

	function formatBytes(bytes: number) {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}
</script>

<div class="admin-overview">
	<h1 class="page-title">System Overview</h1>
	<p class="text-muted">High-level statistics and server health metrics.</p>

	{#if data.stats.pendingUsers > 0}
		<div class="alert alert-warning flex justify-between align-center">
			<span>🌱 There are <strong>{data.stats.pendingUsers}</strong> registration requests pending review.</span>
			<a href="/admin/registrations" class="btn btn-primary btn-sm">Approve Requests</a>
		</div>
	{/if}

	<!-- Stats Grid -->
	<div class="grid grid-3 stats-grid">
		<div class="card stat-card">
			<span class="stat-icon">👥</span>
			<div class="stat-number">{data.stats.totalUsers}</div>
			<div class="stat-label">Total Users</div>
			<div class="stat-sub text-muted">
				{data.stats.activeUsers} active • {data.stats.bannedUsers} banned
			</div>
		</div>

		<div class="card stat-card">
			<span class="stat-icon">📁</span>
			<div class="stat-number">{data.stats.totalProjects}</div>
			<div class="stat-label">Total Projects</div>
			<div class="stat-sub text-muted">
				{data.stats.publicProjects} public dashboards
			</div>
		</div>

		<div class="card stat-card">
			<span class="stat-icon">☁️</span>
			<div class="stat-number">{data.stats.totalImports}</div>
			<div class="stat-label">CSV Imports</div>
			<div class="stat-sub text-muted">
				{data.stats.failedImports} failed imports
			</div>
		</div>
	</div>

	<!-- Storage / Health Section -->
	<div class="card details-section">
		<h2>Server Health & Storage</h2>
		<hr class="divider" />
		<div class="health-grid">
			<div class="health-item">
				<strong>Upload Storage Usage:</strong>
				<span>{formatBytes(data.stats.diskUsageBytes)}</span>
			</div>
			<div class="health-item">
				<strong>SQLite DB Status:</strong>
				<span class="health-badge healthy">Active (WAL Mode)</span>
			</div>
		</div>
	</div>
</div>

<style>
	.page-title {
		margin-bottom: 0.25rem;
	}

	.stats-grid {
		margin-top: 2rem;
		margin-bottom: 2rem;
	}

	.stat-card {
		position: relative;
		padding: 1.5rem;
		border-left: 4px solid var(--primary);
	}

	.stat-icon {
		position: absolute;
		top: 1rem;
		right: 1rem;
		font-size: 1.5rem;
	}

	.stat-number {
		font-size: 2.25rem;
		font-weight: 800;
		line-height: 1;
		color: var(--text-base);
		margin-bottom: 0.25rem;
	}

	.stat-label {
		font-weight: 600;
		font-size: 0.95rem;
		color: var(--text-base);
	}

	.stat-sub {
		font-size: 0.8rem;
		margin-top: 0.25rem;
	}

	.details-section h2 {
		font-size: 1.25rem;
	}

	.divider {
		border: 0;
		border-top: 1px solid var(--border-color);
		margin: 1rem 0;
	}

	.health-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1.5rem;
	}

	.health-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.health-badge {
		display: inline-block;
		width: fit-content;
		padding: 0.15rem 0.5rem;
		border-radius: var(--radius-sm);
		font-size: 0.8rem;
		font-weight: 700;
	}

	.healthy {
		background-color: var(--success-bg);
		color: var(--success);
		border: 1px solid hsl(145, 30%, 80%);
	}
</style>
