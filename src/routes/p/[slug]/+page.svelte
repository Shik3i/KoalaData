<script lang="ts">
	import MetricChart from '$lib/components/MetricChart.svelte';

	let { data } = $props();

	let project = $derived(data.project);

	// Date filter state
	let dateFilter = $state('90');

	// Filter observations on the client side dynamically
	let filteredMetrics = $derived(
		data.metrics.map((metric) => {
			let obs = [...metric.observations];
			if (dateFilter !== 'all') obs = obs.slice(-Number(dateFilter));
			const latest = obs.at(-1)?.value ?? null;
			const previous = obs.at(-2)?.value ?? null;
			return {
				...metric,
				observations: obs,
				latest,
				delta: latest !== null && previous !== null ? latest - previous : null
			};
		})
	);
</script>

<svelte:head>
	<title>{project.name} - KoalaData</title>
	<meta name="description" content={project.shortDescription} />
	<meta property="og:title" content="{project.name} - KoalaData" />
	<meta property="og:description" content={project.shortDescription} />
	<meta property="og:image" content="/p/{project.slug}/og.png" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<div class="container public-dashboard">
	<!-- Top Bar -->
	<header class="public-header card">
		<div class="flex justify-between align-center flex-wrap gap-2">
			<div class="flex align-center gap-1.5 header-details">
				{#if project.logoPath}
					<div class="project-logo-circle">
						<img src="/api/projects/{project.id}/logo" alt="{project.name} Logo" />
					</div>
				{:else}
					<div class="project-logo-circle fallback-circle">
						<span>🐨</span>
					</div>
				{/if}
				<div>
					<h1 class="project-title">{project.name}</h1>
					<p class="project-desc text-muted">{project.shortDescription}</p>
				</div>
			</div>

			<!-- Quick Links & Metadata -->
			<div class="metadata-box flex flex-col gap-0.5 text-right">
				<div class="badges-row flex gap-0.5 justify-end">
					<span class="badge badge-category">{project.category}</span>
					{#if project.verificationStatus === 'verified'}
						<span class="badge badge-verified">✅ Verified</span>
					{/if}
				</div>
				<div class="urls-row flex gap-1 justify-end text-muted">
					{#if project.websiteUrl}
						<a href={project.websiteUrl} target="_blank" rel="noopener">🌍 Website</a>
					{/if}
					{#if project.repositoryUrl}
						<a href={project.repositoryUrl} target="_blank" rel="noopener">💻 Source Code</a>
					{/if}
					{#if project.storeUrl}
						<a href={project.storeUrl} target="_blank" rel="noopener">🛒 Store Page</a>
					{/if}
				</div>
			</div>
		</div>

		{#if project.fullDescription}
			<hr class="divider" />
			<div class="full-desc">
				<strong>About:</strong>
				<p>{project.fullDescription}</p>
			</div>
		{/if}
	</header>

	<!-- Chart Date Filter Controls -->
	<div class="flex justify-between align-center filter-row flex-wrap gap-1">
		<h2>Analytics & Metrics</h2>
		<div class="filter-buttons flex gap-0.5">
			<button class="btn btn-secondary btn-sm {dateFilter === '7' ? 'active' : ''}" onclick={() => dateFilter = '7'}>7D</button>
			<button 
				class="btn btn-secondary btn-sm {dateFilter === '30' ? 'active' : ''}" 
				onclick={() => dateFilter = '30'}
			>
				Last 30 Days
			</button>
			<button class="btn btn-secondary btn-sm {dateFilter === '365' ? 'active' : ''}" onclick={() => dateFilter = '365'}>1Y</button>
			<button 
				class="btn btn-secondary btn-sm {dateFilter === '90' ? 'active' : ''}" 
				onclick={() => dateFilter = '90'}
			>
				Last 90 Days
			</button>
			<button 
				class="btn btn-secondary btn-sm {dateFilter === 'all' ? 'active' : ''}" 
				onclick={() => dateFilter = 'all'}
			>
				All Time
			</button>
		</div>
	</div>

	<!-- Charts Grid -->
	{#if filteredMetrics.length === 0}
		<div class="card empty-state text-center">
			<span class="empty-icon">📊</span>
			<h3>No charts available</h3>
			<p class="text-muted">Metrics data will appear here once the extension developers import observation records.</p>
		</div>
	{:else}
		<div class="grid grid-2 charts-grid">
			{#each filteredMetrics as metric}
				<div class="card chart-card">
					<div class="chart-header flex justify-between align-center">
						<div>
							<span class="source-tag text-muted">Source: {metric.sourceName}</span>
							{#if metric.latest !== null}
								<div class="metric-kpi">
									<strong>{metric.latest.toLocaleString()}</strong>
									{#if metric.delta !== null}
										<span class:positive={metric.delta > 0} class:negative={metric.delta < 0}>{metric.delta > 0 ? '+' : ''}{metric.delta.toLocaleString()}</span>
									{/if}
								</div>
							{/if}
						</div>
						{#if metric.isCumulative}
							<span class="badge badge-cumulative">Cumulative</span>
						{/if}
					</div>
					{#if metric.observations.length === 0}
						<div class="empty-chart text-muted text-center flex align-center justify-center">
							No data points in this timeframe.
						</div>
					{:else}
						<MetricChart title={metric.name} observations={metric.observations} />
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.public-dashboard {
		padding: 2rem 0;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.public-header {
		padding: 1.5rem;
	}

	.project-logo-circle {
		width: 60px;
		height: 60px;
		border-radius: 50%;
		overflow: hidden;
		border: 1px solid var(--border-color);
		background-color: var(--bg-inset);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.project-logo-circle img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.fallback-circle span {
		font-size: 1.75rem;
	}

	.project-title {
		font-size: 1.75rem;
		margin-bottom: 0.25rem;
	}
	.metric-kpi { display: flex; align-items: baseline; gap: 0.6rem; margin-top: 0.3rem; }
	.metric-kpi strong { font-size: 1.35rem; }
	.metric-kpi span { color: var(--text-muted); font-size: 0.85rem; font-weight: 600; }
	.metric-kpi .positive { color: var(--success); }
	.metric-kpi .negative { color: var(--error); }
	.project-desc {
		font-size: 0.95rem;
		margin-bottom: 0;
	}

	.divider {
		border: 0;
		border-top: 1px solid var(--border-color);
		margin: 1.25rem 0;
	}

	.full-desc p {
		font-size: 0.9rem;
		color: var(--text-muted);
		margin-top: 0.25rem;
		white-space: pre-wrap;
	}

	.badge {
		font-size: 0.75rem;
		padding: 0.15rem 0.5rem;
		border-radius: var(--radius-sm);
		font-weight: 700;
	}
	.badge-category {
		background-color: var(--primary-bg);
		color: var(--primary);
	}
	.badge-verified {
		background-color: var(--success-bg);
		color: var(--success);
	}
	.badge-cumulative {
		background-color: var(--bg-inset);
		color: var(--text-muted);
	}

	.filter-row h2 {
		font-size: 1.35rem;
	}

	.filter-buttons .btn.active {
		background-color: var(--primary);
		color: var(--text-inverse);
		border-color: var(--primary);
	}

	.charts-grid {
		gap: 2rem;
	}

	.chart-card {
		padding: 1.25rem;
	}

	.chart-header {
		font-size: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.empty-chart {
		height: 350px;
	}

	.empty-state {
		padding: 4rem;
	}
	.empty-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
		display: block;
	}
</style>
