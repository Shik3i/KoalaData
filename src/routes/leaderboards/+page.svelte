<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	let { data } = $props();

	function formatNumber(num: number) {
		return num.toLocaleString();
	}

	// Interactive sorting state
	let sortBy = $state<'growth' | 'growthPercent' | 'activeUsers' | 'installs'>('growth');

	// Reactive derived sorted leaderboard list
	let sortedLeaderboard = $derived(
		[...data.leaderboard].sort((a, b) => {
			if (sortBy === 'growth') return b.growth - a.growth;
			if (sortBy === 'growthPercent') return b.growthPercent - a.growthPercent;
			if (sortBy === 'activeUsers') return b.activeUsers - a.activeUsers;
			if (sortBy === 'installs') return b.installs - a.installs;
			return 0;
		})
	);
</script>

<svelte:head>
	<title>Growth Leaderboard - KoalaData</title>
</svelte:head>

<div class="container leaderboard-page">
	<h1 class="page-title"><Icon name="trophy" /> Weekly Growth Leaderboard</h1>
	
	<div class="flex justify-between align-center flex-wrap gap-1 filter-bar">
		<p class="text-muted text-sm">Ranked based on weekly active user growth over the last 30 days. Only approved, public extensions are ranked.</p>
		
		<div class="sort-selector flex gap-0.5 align-center flex-wrap">
			<span class="text-xs text-muted font-semibold uppercase tracking-wider">Sort by:</span>
			<div class="btn-group">
				<button class="btn btn-secondary btn-sm {sortBy === 'growth' ? 'active' : ''}" onclick={() => sortBy = 'growth'}>Absolute Growth</button>
				<button class="btn btn-secondary btn-sm {sortBy === 'growthPercent' ? 'active' : ''}" onclick={() => sortBy = 'growthPercent'}>% Growth</button>
				<button class="btn btn-secondary btn-sm {sortBy === 'activeUsers' ? 'active' : ''}" onclick={() => sortBy = 'activeUsers'}>Total Users</button>
				<button class="btn btn-secondary btn-sm {sortBy === 'installs' ? 'active' : ''}" onclick={() => sortBy = 'installs'}>Daily Installs</button>
			</div>
		</div>
	</div>

	<div class="card leaderboard-card">
		{#if sortedLeaderboard.length === 0}
			<div class="empty-state text-center py-4">
				<span class="empty-icon"><Icon name="trophy" /></span>
				<h2>Leaderboard is empty</h2>
				<p class="text-muted">Extensions will appear here once approved by administrators and data is imported.</p>
			</div>
		{:else}
			<div class="table-wrapper">
				<table>
					<thead>
						<tr>
							<th>Rank</th>
							<th>Extension</th>
							<th>Weekly Active Users</th>
							<th>Daily Installs</th>
							<th>30-Day Growth</th>
							<th>Growth %</th>
						</tr>
					</thead>
					<tbody>
						{#each sortedLeaderboard as project, idx}
							<tr>
								<td>
									<span class="rank-badge rank-{idx + 1}">{idx + 1}</span>
								</td>
								<td>
									<div class="flex align-center gap-1">
										{#if project.logoPath}
											<img src="/api/projects/{project.projectId}/logo" alt={project.name} class="tbl-logo" />
										{:else}
											<span class="tbl-logo fallback-tbl-logo"><Icon name="paw-print" /></span>
										{/if}
										<div>
											<div class="flex align-center gap-0.5">
												<strong><a href="/p/{project.slug}">{project.name}</a></strong>
												{#if project.growthPercent >= 15 && project.growth > 0}
													<span class="badge-trending" title="Growing fast! Over 15% growth in the last 30 days."><Icon name="sparkle" /> Trending</span>
												{/if}
											</div>
											<div class="text-muted" style="font-size: 0.75rem;">{project.category}</div>
										</div>
									</div>
								</td>
								<td>
									<strong>{formatNumber(project.activeUsers)}</strong>
								</td>
								<td>
									<strong>{formatNumber(project.installs)}</strong>
								</td>
								<td>
									<span class="growth-text {project.growth >= 0 ? 'growth-up' : 'growth-down'}">
										{project.growth >= 0 ? '+' : ''}{formatNumber(project.growth)}
									</span>
								</td>
								<td>
									<span class="growth-badge {project.growthPercent >= 0 ? 'growth-up-bg' : 'growth-down-bg'}">
										{project.growthPercent >= 0 ? '+' : ''}{project.growthPercent.toFixed(1)}%
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>

<style>
	.leaderboard-page {
		padding-block: 2rem;
	}

	.page-title {
		margin-bottom: 0.25rem;
	}

	.filter-bar {
		margin-top: 1rem;
		margin-bottom: 1.5rem;
	}

	.btn-group {
		display: inline-flex;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		overflow: hidden;
		background: var(--bg-surface);
	}
	.btn-group .btn {
		border: none;
		border-radius: 0;
		background: transparent;
		color: var(--text-muted);
		font-weight: 500;
		padding: 0.4rem 0.8rem;
		font-size: 0.8rem;
		border-right: 1px solid var(--border-color);
	}
	.btn-group .btn:last-child {
		border-right: none;
	}
	.btn-group .btn.active {
		background: var(--primary-bg);
		color: var(--primary);
		font-weight: 600;
	}

	.leaderboard-card {
		padding: 1.5rem;
	}

	.table-wrapper {
		overflow-x: auto;
	}

	table {
		margin-bottom: 0;
	}

	th, td {
		padding: 1rem;
		vertical-align: middle;
	}

	.rank-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		font-weight: 800;
		font-size: 0.9rem;
		background-color: var(--bg-inset);
		color: var(--text-muted);
	}
	.rank-1 { background-color: #fdf5ea; color: #b37424; }
	.rank-2 { background-color: #f3f4f6; color: #4b5563; }
	.rank-3 { background-color: #fdf2f2; color: #9b1c1c; }

	.tbl-logo {
		width: 32px;
		height: 32px;
		border-radius: 6px;
		object-fit: cover;
		border: 1px solid var(--border-color);
	}
	.fallback-tbl-logo {
		background-color: var(--bg-inset);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 1.1rem;
		border: 1px solid var(--border-color);
	}

	.badge-trending {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		background-color: #fdf5ea;
		color: #b37424;
		border: 1px solid #fbe3c7;
		padding: 0.1rem 0.35rem;
		border-radius: var(--radius-sm);
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.02em;
		animation: pulse-border 2s infinite ease-in-out;
	}

	@keyframes pulse-border {
		0%, 100% { border-color: #fbe3c7; }
		50% { border-color: #b37424; }
	}

	.growth-text {
		font-weight: 700;
	}
	.growth-up { color: var(--success); }
	.growth-down { color: var(--error); }

	.growth-badge {
		font-size: 0.8rem;
		font-weight: 700;
		padding: 0.15rem 0.45rem;
		border-radius: var(--radius-sm);
	}
	.growth-up-bg { background-color: var(--success-bg); color: var(--success); }
	.growth-down-bg { background-color: var(--error-bg); color: var(--error); }

	.empty-state {
		padding: 3rem;
	}
	.empty-icon {
		font-size: 2.5rem;
		margin-bottom: 0.5rem;
		display: block;
	}
</style>
