<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	let { data } = $props();

	function getDomain(url: string | null | undefined): string | null {
		if (!url) return null;
		try {
			const parsed = new URL(url);
			return parsed.hostname;
		} catch (e) {
			const cleaned = url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
			return cleaned || null;
		}
	}

	function formatNumber(num: number) {
		return num.toLocaleString();
	}
</script>

<svelte:head>
	<title>Growth Leaderboard - KoalaData</title>
</svelte:head>

<div class="container leaderboard-page">
	<h1 class="page-title"><Icon name="trophy" /> Weekly Growth Leaderboard</h1>
	<p class="text-muted">Ranked by weekly active user growth over the last 30 days. Only approved, public extensions are ranked.</p>

	<div class="card leaderboard-card" style="margin-top: 1.5rem; padding: 1.5rem;">
		{#if data.leaderboard.length === 0}
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
							<th>30-Day Growth</th>
							<th>Growth %</th>
						</tr>
					</thead>
					<tbody>
						{#each data.leaderboard as project, idx}
							<tr>
								<td>
									<span class="rank-badge rank-{idx + 1}">{idx + 1}</span>
								</td>
								<td>
									<div class="flex align-center gap-1">
										{#if project.logoPath}
											<img src="/api/projects/{project.projectId}/logo" alt={project.name} class="tbl-logo" />
										{:else if project.websiteUrl && getDomain(project.websiteUrl)}
											<img src="https://www.google.com/s2/favicons?sz=64&domain={getDomain(project.websiteUrl)}" alt={project.name} class="tbl-logo" />
										{:else}
											<span class="tbl-logo fallback-tbl-logo"><Icon name="paw-print" /></span>
										{/if}
										<div>
											<strong><a href="/p/{project.slug}">{project.name}</a></strong>
											<div class="text-muted" style="font-size: 0.75rem;">{project.category}</div>
										</div>
									</div>
								</td>
								<td>
									<strong>{formatNumber(project.activeUsers)}</strong>
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
