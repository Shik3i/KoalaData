<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
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

	function formatNumber(num: number) {
		return num.toLocaleString();
	}

	// Derived KPI summaries over the currently selected timeframe
	let kpis = $derived.by(() => {
		let totalImpressions = 0;
		let totalPageViews = 0;
		let totalInstalls = 0;
		let totalUninstalls = 0;
		let latestActiveUsers = null;

		for (const metric of filteredMetrics) {
			const sum = metric.observations.reduce((acc: number, o: { value: number }) => acc + o.value, 0);
			if (metric.metricType === 'store_impressions') {
				totalImpressions = sum;
			} else if (metric.metricType === 'store_page_views') {
				totalPageViews = sum;
			} else if (metric.metricType === 'installs') {
				totalInstalls = sum;
			} else if (metric.metricType === 'uninstalls') {
				totalUninstalls = sum;
			} else if (metric.metricType === 'active_users') {
				latestActiveUsers = metric.latest;
			}
		}

		const storeToPageRate = totalImpressions > 0 ? (totalPageViews / totalImpressions) * 100 : null;
		const pageToInstallRate = totalPageViews > 0 ? (totalInstalls / totalPageViews) * 100 : null;
		const churnRate = totalInstalls > 0 ? (totalUninstalls / totalInstalls) * 100 : null;

		return {
			totalImpressions,
			totalPageViews,
			totalInstalls,
			totalUninstalls,
			latestActiveUsers,
			storeToPageRate,
			pageToInstallRate,
			churnRate
		};
	});

	// Next WAU Milestone
	let milestoneInfo = $derived.by(() => {
		const current = kpis.latestActiveUsers ?? 0;
		if (current === 0) return null;

		const milestones = [100, 500, 1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];
		const next = milestones.find((m) => m > current) || milestones[milestones.length - 1] * 2;
		const percent = Math.min((current / next) * 100, 100);

		return {
			current,
			next,
			percent,
			remaining: next - current
		};
	});

	// All-Time High Installs (ATH)
	let installsRecord = $derived.by(() => {
		const installsMetric = data.metrics.find((m) => m.metricType === 'installs');
		if (!installsMetric || installsMetric.observations.length === 0) return null;

		let maxObs = installsMetric.observations[0];
		for (const o of installsMetric.observations) {
			if (o.value > maxObs.value) {
				maxObs = o;
			}
		}
		return maxObs;
	});

	// Combined installs & uninstalls chart logic
	let installsMetric = $derived(filteredMetrics.find((m) => m.metricType === 'installs'));
	let uninstallsMetric = $derived(filteredMetrics.find((m) => m.metricType === 'uninstalls'));

	let hasCombinedInstallsUninstalls = $derived(
		!!(installsMetric && 
		uninstallsMetric && 
		installsMetric.observations.length > 0 && 
		uninstallsMetric.observations.length > 0)
	);

	let combinedSeriesList = $derived.by(() => {
		if (!hasCombinedInstallsUninstalls) return [];
		return [
			{
				name: 'Installs',
				color: '#2d6645',
				observations: installsMetric!.observations
			},
			{
				name: 'Uninstalls',
				color: '#c84e46',
				observations: uninstallsMetric!.observations
			}
		];
	});

	let displayMetrics = $derived(
		filteredMetrics.filter((m) => {
			if (hasCombinedInstallsUninstalls && (m.metricType === 'installs' || m.metricType === 'uninstalls')) {
				return false;
			}
			return true;
		})
	);

	function getMetricLabel(type: string, fallback: string): string {
		const labels: Record<string, string> = {
			active_users: 'Weekly Active Users',
			installs: 'Installs',
			uninstalls: 'Uninstalls',
			store_page_views: 'Store Page Views',
			store_impressions: 'Store Impressions'
		};
		return labels[type] || fallback;
	}
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
						<Icon name="paw-print" />
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
						<span class="badge badge-verified"><Icon name="seal-check" /> Verified</span>
					{/if}
				</div>
				<div class="urls-row flex gap-1 justify-end text-muted">
					{#if project.websiteUrl}
						<a href={project.websiteUrl} target="_blank" rel="noopener"><Icon name="globe" /> Website</a>
					{/if}
					{#if project.repositoryUrl}
						<a href={project.repositoryUrl} target="_blank" rel="noopener"><Icon name="code" /> Source Code</a>
					{/if}
					{#if project.storeUrl}
						<a href={project.storeUrl} target="_blank" rel="noopener"><Icon name="storefront" /> Store Page</a>
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
			<button 
				class="btn btn-secondary btn-sm {dateFilter === '90' ? 'active' : ''}" 
				onclick={() => dateFilter = '90'}
			>
				Last 90 Days
			</button>
			<button class="btn btn-secondary btn-sm {dateFilter === '365' ? 'active' : ''}" onclick={() => dateFilter = '365'}>1Y</button>
			<button 
				class="btn btn-secondary btn-sm {dateFilter === 'all' ? 'active' : ''}" 
				onclick={() => dateFilter = 'all'}
			>
				All Time
			</button>
		</div>
	</div>

	<!-- KPI Dashboard Grid -->
	<div class="grid grid-3 kpi-dashboard-grid">
		<!-- Store-to-Page Conversion KPI -->
		<div class="card kpi-card">
			<div class="kpi-title text-muted">Store Page CTR</div>
			<div class="kpi-value">
				{#if kpis.storeToPageRate !== null}
					{kpis.storeToPageRate.toFixed(2)}%
				{:else}
					—
				{/if}
			</div>
			<p class="kpi-desc text-muted">Page Views per Store Impression</p>
		</div>

		<!-- Page-to-Install Conversion KPI -->
		<div class="card kpi-card">
			<div class="kpi-title text-muted">Install Conversion</div>
			<div class="kpi-value">
				{#if kpis.pageToInstallRate !== null}
					{kpis.pageToInstallRate.toFixed(2)}%
				{:else}
					—
				{/if}
			</div>
			<p class="kpi-desc text-muted">Installs per Store Page View</p>
		</div>

		<!-- Churn Rate KPI -->
		<div class="card kpi-card">
			<div class="kpi-title text-muted">Daily Churn Rate</div>
			<div class="kpi-value {kpis.churnRate && kpis.churnRate > 80 ? 'text-danger' : ''}">
				{#if kpis.churnRate !== null}
					{kpis.churnRate.toFixed(1)}%
				{:else}
					—
				{/if}
			</div>
			<p class="kpi-desc text-muted">Uninstalls relative to Installs</p>
		</div>
	</div>

	<!-- Milestones and Growth records -->
	{#if milestoneInfo || installsRecord}
		<div class="grid grid-2 records-dashboard-grid">
			{#if milestoneInfo}
				<div class="card milestone-card">
					<div class="flex justify-between align-center">
						<span class="milestone-title font-semibold"><Icon name="crown" /> Next Milestone</span>
						<span class="milestone-target text-muted">{formatNumber(milestoneInfo.next)} WAUs</span>
					</div>
					<div class="progress-bar-wrapper">
						<div class="progress-bar" style="width: {milestoneInfo.percent}%"></div>
					</div>
					<div class="flex justify-between text-xs text-muted mt-0.5">
						<span>{formatNumber(milestoneInfo.current)} current</span>
						<span>{formatNumber(milestoneInfo.remaining)} to go</span>
					</div>
				</div>
			{/if}

			{#if installsRecord}
				<div class="card ath-card flex align-center gap-1.5">
					<div class="ath-icon-wrapper"><Icon name="sparkle" /></div>
					<div>
						<div class="text-xs text-muted uppercase tracking-wider font-semibold">All-Time High Installs</div>
						<div class="ath-value"><strong>{formatNumber(installsRecord.value)}</strong> <span class="text-muted">installs/day</span></div>
						<div class="text-xs text-muted">Achieved on {new Date(installsRecord.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</div>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Charts Grid -->
	{#if displayMetrics.length === 0 && !hasCombinedInstallsUninstalls}
		<div class="card empty-state text-center">
			<span class="empty-icon"><Icon name="chart-line" /></span>
			<h3>No charts available</h3>
			<p class="text-muted">Metrics data will appear here once the extension developers import observation records.</p>
		</div>
	{:else}
		<div class="flex flex-col gap-2 charts-grid">
			<!-- Combined Installs & Uninstalls Chart -->
			{#if hasCombinedInstallsUninstalls}
				<div class="card chart-card">
					<div class="chart-header flex justify-between align-center">
						<div>
							<span class="source-tag text-muted">Combined growth events</span>
							<div class="metric-kpi font-semibold" style="font-size: 1.1rem;">
								<span>{(installsMetric?.displayValue ?? 0).toLocaleString()} Installs</span>
								<span class="text-muted">vs</span>
								<span style="color: var(--error);">{(uninstallsMetric?.displayValue ?? 0).toLocaleString()} Uninstalls</span>
							</div>
						</div>
					</div>
					<MetricChart title="Daily Installs vs Uninstalls" seriesList={combinedSeriesList} />
				</div>
			{/if}

			<!-- Other Metrics -->
			{#each displayMetrics as metric}
				<div class="card chart-card">
					<div class="chart-header flex justify-between align-center">
						<div>
							<span class="source-tag text-muted">Source: {metric.sourceName}</span>
							{#if metric.displayValue !== null && metric.displayValue !== undefined}
								<div class="metric-kpi">
									<strong>{metric.displayValue.toLocaleString()}</strong>
									{#if metric.metricType === 'active_users' && metric.delta !== null && metric.delta !== undefined}
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
						<MetricChart title={getMetricLabel(metric.metricType, metric.name)} observations={metric.observations} />
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.public-dashboard {
		padding-block: 2rem;
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

	.fallback-circle :global(.app-icon) {
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

	.kpi-dashboard-grid {
		gap: 1rem;
	}
	.kpi-card {
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		min-height: 120px;
	}
	.kpi-title {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: 600;
	}
	.kpi-value {
		font-size: 1.8rem;
		font-weight: 700;
		color: var(--text-base);
		margin-block: 0.25rem;
	}
	.kpi-value.text-danger {
		color: var(--error);
	}
	.kpi-desc {
		font-size: 0.8rem;
		margin-bottom: 0;
	}

	.records-dashboard-grid {
		gap: 1rem;
	}
	.milestone-card {
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}
	.milestone-title {
		font-size: 0.9rem;
		color: var(--text-base);
	}
	.milestone-title :global(.app-icon) {
		color: var(--accent);
	}
	.milestone-target {
		font-size: 0.85rem;
	}
	.progress-bar-wrapper {
		width: 100%;
		height: 8px;
		background-color: var(--bg-inset);
		border-radius: 4px;
		margin-top: 0.75rem;
		overflow: hidden;
		border: 1px solid var(--border-color);
	}
	.progress-bar {
		height: 100%;
		background-color: var(--primary);
		border-radius: 4px;
		transition: width 0.3s ease;
	}

	.ath-card {
		padding: 1.25rem;
	}
	.ath-icon-wrapper {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background-color: var(--primary-bg);
		color: var(--primary);
		display: grid;
		place-items: center;
		font-size: 1.25rem;
		flex-shrink: 0;
	}
	.ath-value {
		font-size: 1.15rem;
		margin-block: 0.15rem;
	}
</style>
