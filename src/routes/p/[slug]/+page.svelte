<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import MetricChart from '$lib/components/MetricChart.svelte';

	let { data } = $props();

	let project = $derived(data.project);

	// Date filter state
	let dateFilter = $state('90');
	let showMovingAverage = $state(false);
	let showForecast = $state(false);

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
				delta: latest !== null && previous !== null ? latest - previous : null,
				displayValue: latest
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
		let installsObsCount = 0;
		let uninstallsObsCount = 0;

		for (const metric of filteredMetrics) {
			const sum = metric.observations.reduce((acc: number, o: { value: number }) => acc + o.value, 0);
			if (metric.metricType === 'store_impressions') {
				totalImpressions = sum;
			} else if (metric.metricType === 'store_page_views') {
				totalPageViews = sum;
			} else if (metric.metricType === 'installs') {
				totalInstalls = sum;
				installsObsCount = metric.observations.length;
			} else if (metric.metricType === 'uninstalls') {
				totalUninstalls = sum;
				uninstallsObsCount = metric.observations.length;
			} else if (metric.metricType === 'active_users') {
				latestActiveUsers = metric.latest;
			}
		}

		const dayCount = Math.max(installsObsCount, uninstallsObsCount, 1);
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
			churnRate,
			dayCount,
			avgInstallsPerDay: installsObsCount > 0 ? totalInstalls / dayCount : null,
			avgUninstallsPerDay: uninstallsObsCount > 0 ? totalUninstalls / dayCount : null
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

	// Milestone prediction based on active user growth trend
	let milestonePrediction = $derived.by(() => {
		if (!milestoneInfo) return null;
		const activeMetric = filteredMetrics.find((m) => m.metricType === 'active_users');
		if (!activeMetric || activeMetric.observations.length < 2) return null;

		const obs = activeMetric.observations;
		let totalDelta = 0;
		for (let i = 1; i < obs.length; i++) {
			totalDelta += obs[i].value - obs[i - 1].value;
		}
		const firstDate = new Date(obs[0].date).getTime();
		const lastObservationDate = new Date(obs.at(-1)!.date);
		const elapsedDays = Math.max((lastObservationDate.getTime() - firstDate) / 86_400_000, 1);
		const avgDailyGrowth = totalDelta / elapsedDays;
		if (avgDailyGrowth <= 0) return null;

		const daysToTarget = Math.ceil(milestoneInfo.remaining / avgDailyGrowth);
		const estimatedDate = new Date(lastObservationDate);
		estimatedDate.setDate(estimatedDate.getDate() + daysToTarget);

		return { avgDailyGrowth, daysToTarget, estimatedDate, observationCount: obs.length };
	});

	// All-Time High Installs (ATH)
	// Best/Worst day-of-week analysis for installs
	let dayAnalysis = $derived.by(() => {
		const metric = filteredMetrics.find((m) => m.metricType === 'installs');
		if (!metric || metric.observations.length < 7) return null;

		const dayTotals: Record<number, { sum: number; count: number }> = {};
		const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

		for (const obs of metric.observations) {
			const d = new Date(obs.date);
			const day = d.getDay();
			if (!dayTotals[day]) dayTotals[day] = { sum: 0, count: 0 };
			dayTotals[day].sum += obs.value;
			dayTotals[day].count++;
		}

		const dayAvgs = Object.entries(dayTotals).map(([day, { sum, count }]) => ({
			day: Number(day),
			name: dayNames[Number(day)],
			avg: sum / count
		}));

		dayAvgs.sort((a, b) => b.avg - a.avg);

		return {
			best: dayAvgs[0],
			worst: dayAvgs[dayAvgs.length - 1],
			all: dayAvgs
		};
	});

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

	// Compare mode vs previous period
	let compareMode = $state(false);

	function getCompareSeries(observations: Array<{ date: string; value: number }>) {
		if (!compareMode || !observations || observations.length < 4) return null;
		const mid = Math.floor(observations.length / 2);
		const periodLength = Math.min(mid, observations.length - mid);
		return [
			{ name: 'Previous Period', color: '#94a3b8', observations: observations.slice(0, periodLength) },
			{ name: 'Current Period', color: '#2f6d47', observations: observations.slice(-periodLength) }
		];
	}

	function getCompareCategoryLabels(observations: Array<{ date: string; value: number }>) {
		const mid = Math.floor(observations.length / 2);
		const periodLength = Math.min(mid, observations.length - mid);
		return Array.from({ length: periodLength }, (_, index) => `Day ${index + 1}`);
	}

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
		if (compareMode) {
			const installsSplit = getCompareSeries(installsMetric!.observations);
			const uninstallsSplit = getCompareSeries(uninstallsMetric!.observations);
			if (installsSplit && uninstallsSplit) {
				return [
					{ name: 'Installs (Prev)', color: '#94a3b8', observations: installsSplit[0].observations },
					{ name: 'Installs (Current)', color: '#2d6645', observations: installsSplit[1].observations },
					{ name: 'Uninstalls (Prev)', color: '#c84e4680', observations: uninstallsSplit[0].observations },
					{ name: 'Uninstalls (Current)', color: '#c84e46', observations: uninstallsSplit[1].observations }
				];
			}
		}
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
		<div class="flex align-center gap-1 flex-wrap">
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
			<button class="btn btn-sm {compareMode ? 'btn-primary' : 'btn-secondary'}" onclick={() => compareMode = !compareMode}>
				<Icon name="clock-counter-clockwise" /> {compareMode ? 'Comparing' : 'Compare'}
			</button>
			<button
				type="button"
				class="btn btn-sm {showMovingAverage ? 'btn-primary' : 'btn-secondary'}"
				aria-pressed={showMovingAverage}
				title="Show or hide the derived 7-day moving average"
				onclick={() => showMovingAverage = !showMovingAverage}
			>
				<Icon name="chart-line" /> 7-Day Avg {showMovingAverage ? 'On' : 'Off'}
			</button>
			<button
				type="button"
				class="btn btn-sm {showForecast ? 'btn-primary' : 'btn-secondary'}"
				aria-pressed={showForecast}
				title="Show or hide the 30-day linear estimate"
				onclick={() => showForecast = !showForecast}
			>
				<Icon name="chart-line-up" /> Forecast {showForecast ? 'On' : 'Off'}
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

	<!-- Daily Averages Row -->
	{#if kpis.avgInstallsPerDay !== null || kpis.avgUninstallsPerDay !== null}
		<div class="grid grid-3 avg-grid">
			{#if kpis.avgInstallsPerDay !== null}
				<div class="card avg-card">
					<div class="kpi-title text-muted">Avg Installs / Day</div>
					<div class="avg-value">{kpis.avgInstallsPerDay.toFixed(1)}</div>
					<div class="avg-bar-wrapper">
						<div class="avg-bar avg-bar-installs" style="width: 100%"></div>
					</div>
					<p class="kpi-desc text-muted">{formatNumber(kpis.totalInstalls)} total in {kpis.dayCount} days</p>
				</div>
			{/if}
			{#if kpis.avgUninstallsPerDay !== null}
				<div class="card avg-card">
					<div class="kpi-title text-muted">Avg Uninstalls / Day</div>
					<div class="avg-value">{kpis.avgUninstallsPerDay.toFixed(1)}</div>
					<div class="avg-bar-wrapper">
						<div class="avg-bar avg-bar-uninstalls" style="width: {kpis.avgInstallsPerDay && kpis.avgInstallsPerDay > 0 ? Math.min((kpis.avgUninstallsPerDay / kpis.avgInstallsPerDay) * 100, 100) : 0}%"></div>
					</div>
					<p class="kpi-desc text-muted">{formatNumber(kpis.totalUninstalls)} total in {kpis.dayCount} days</p>
				</div>
			{/if}
			{#if kpis.avgInstallsPerDay !== null && kpis.avgUninstallsPerDay !== null}
				<div class="card avg-card">
					<div class="kpi-title text-muted">Net Growth / Day</div>
					<div class="avg-value" class:text-positive={(kpis.avgInstallsPerDay - kpis.avgUninstallsPerDay) > 0} class:text-danger={(kpis.avgInstallsPerDay - kpis.avgUninstallsPerDay) < 0}>
						{(kpis.avgInstallsPerDay - kpis.avgUninstallsPerDay) > 0 ? '+' : ''}{(kpis.avgInstallsPerDay - kpis.avgUninstallsPerDay).toFixed(1)}
					</div>
					<div class="avg-bar-wrapper">
						<div class="avg-bar avg-bar-net" style="width: {Math.min(Math.abs(kpis.avgInstallsPerDay - kpis.avgUninstallsPerDay) / Math.max(kpis.avgInstallsPerDay, kpis.avgUninstallsPerDay, 1) * 100, 100)}%"></div>
					</div>
					<p class="kpi-desc text-muted">Installs – Uninstalls per day</p>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Conversion Funnel -->
	{#if kpis.totalImpressions > 0 && kpis.totalPageViews > 0 && kpis.totalInstalls > 0}
		<div class="card funnel-card">
			<div class="kpi-title text-muted">Conversion Funnel</div>
			<div class="funnel-steps">
				<div class="funnel-step">
					<div class="funnel-label">
						<span>Store Impressions</span>
						<span class="funnel-value">{formatNumber(kpis.totalImpressions)}</span>
					</div>
					<div class="funnel-bar-track">
						<div class="funnel-bar" style="width: 100%"></div>
					</div>
				</div>
				<div class="funnel-arrow">↓ {kpis.storeToPageRate?.toFixed(1)}% CTR</div>
				<div class="funnel-step">
					<div class="funnel-label">
						<span>Store Page Views</span>
						<span class="funnel-value">{formatNumber(kpis.totalPageViews)}</span>
					</div>
					<div class="funnel-bar-track">
						<div class="funnel-bar" style="width: {Math.max((kpis.totalPageViews / kpis.totalImpressions) * 100, 5)}%"></div>
					</div>
				</div>
				<div class="funnel-arrow">↓ {kpis.pageToInstallRate?.toFixed(1)}% conversion</div>
				<div class="funnel-step">
					<div class="funnel-label">
						<span>Installs</span>
						<span class="funnel-value">{formatNumber(kpis.totalInstalls)}</span>
					</div>
					<div class="funnel-bar-track">
						<div class="funnel-bar funnel-bar-final" style="width: {Math.max((kpis.totalInstalls / kpis.totalImpressions) * 100, 3)}%"></div>
					</div>
				</div>
			</div>
		</div>
	{/if}

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
					{#if milestonePrediction}
						<div class="milestone-prediction">
							<Icon name="chart-line-up" /> Estimate: ~{milestonePrediction.daysToTarget} days ({new Date(milestonePrediction.estimatedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })})
							<span class="prediction-note">Based on {milestonePrediction.observationCount} observations; actual results may differ.</span>
						</div>
					{/if}
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

	<!-- Best/Worst Day Analysis -->
	{#if dayAnalysis}
		<div class="card day-card">
			<div class="day-header">
				<div class="day-best-block">
					<div class="kpi-title text-muted">Most Installs</div>
					<div class="day-name">{dayAnalysis.best.name}</div>
					<div class="day-avg">{dayAnalysis.best.avg.toFixed(1)} <span class="text-muted">avg/day</span></div>
				</div>
				<div class="day-vs text-muted">vs</div>
				<div class="day-worst-block">
					<div class="kpi-title text-muted">Fewest Installs</div>
					<div class="day-name">{dayAnalysis.worst.name}</div>
					<div class="day-avg">{dayAnalysis.worst.avg.toFixed(1)} <span class="text-muted">avg/day</span></div>
				</div>
			</div>
			<div class="day-bars">
				{#each dayAnalysis.all as d}
					<div class="day-bar-col" title="{d.name}: {d.avg.toFixed(1)}">
						<div class="day-bar-fill" style="height: {Math.max((d.avg / dayAnalysis.best.avg) * 100, 10)}%"></div>
						<div class="day-bar-label text-xs text-muted">{d.name.slice(0, 2)}</div>
					</div>
				{/each}
			</div>
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
							<span class="source-tag text-muted">Daily Installs vs Uninstalls</span>
							<div class="metric-kpi font-semibold">
								<span class="kpi-installs">{kpis.totalInstalls.toLocaleString()} Installs</span>
								<span class="kpi-vs">vs</span>
								<span class="kpi-uninstalls">{kpis.totalUninstalls.toLocaleString()} Uninstalls</span>
							</div>
						</div>
					</div>
					<MetricChart
						seriesList={combinedSeriesList}
						categoryLabels={compareMode ? getCompareCategoryLabels(installsMetric!.observations) : undefined}
						showMovingAverage={showMovingAverage}
						showForecast={showForecast}
					/>
				</div>
			{/if}

			<!-- Other Metrics -->
			{#each displayMetrics as metric}
				<div class="card chart-card">
					<div class="chart-header flex justify-between align-center">
						<div>
							<span class="source-tag text-muted">{getMetricLabel(metric.metricType, metric.name)}</span>
							<span class="metric-source text-xs text-muted">Source: {metric.sourceName}</span>
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
						{@const compareSeries = getCompareSeries(metric.observations)}
						{#if compareSeries}
							<MetricChart
								seriesList={compareSeries}
								categoryLabels={getCompareCategoryLabels(metric.observations)}
								showMovingAverage={showMovingAverage}
								showForecast={showForecast}
							/>
						{:else}
							<MetricChart
								observations={metric.observations}
								showMovingAverage={showMovingAverage}
								showForecast={showForecast}
							/>
						{/if}
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
		margin-bottom: 0;
	}

	.chart-header .metric-kpi {
		margin-top: 0.15rem;
	}

	.kpi-installs {
		color: var(--primary);
		font-weight: 700;
	}

	.kpi-vs {
		color: var(--text-muted);
		font-weight: 400;
		font-size: 0.85rem;
		text-transform: lowercase;
	}

	.kpi-uninstalls {
		color: var(--error);
		font-weight: 700;
	}

	.empty-chart {
		height: 300px;
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

	/* Daily Averages */
	.avg-grid {
		gap: 1rem;
	}
	.avg-card {
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		min-height: 120px;
	}
	.avg-value {
		font-size: 1.6rem;
		font-weight: 700;
		color: var(--text-base);
		margin-block: 0.2rem;
	}
	.avg-value.text-positive { color: var(--success); }
	.avg-value.text-danger { color: var(--error); }
	.avg-bar-wrapper {
		width: 100%;
		height: 6px;
		background-color: var(--bg-inset);
		border-radius: 3px;
		overflow: hidden;
		margin-bottom: 0.25rem;
	}
	.avg-bar {
		height: 100%;
		border-radius: 3px;
		transition: width 0.3s ease;
	}
	.avg-bar-installs { background-color: var(--primary); }
	.avg-bar-uninstalls { background-color: var(--error); }
	.avg-bar-net { background-color: var(--accent); }

	/* Milestone prediction */
	.milestone-prediction {
		margin-top: 0.75rem;
		padding-top: 0.6rem;
		border-top: 1px solid var(--border-color);
		font-size: 0.8rem;
		color: var(--text-muted);
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}
	.milestone-prediction :global(.app-icon) {
		color: var(--primary);
	}
	.prediction-note {
		flex-basis: 100%;
		font-size: 0.7rem;
		margin-left: 1.35rem;
		margin-top: 0.1rem;
	}

	/* Metric source label */
	.metric-source {
		display: block;
		margin-top: 0.1rem;
	}

	/* Conversion Funnel */
	.funnel-card {
		padding: 1.25rem;
	}
	.funnel-card .kpi-title {
		margin-bottom: 0.75rem;
	}
	.funnel-steps {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.funnel-step {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.funnel-label {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.9rem;
		font-weight: 600;
	}
	.funnel-value {
		font-weight: 700;
		color: var(--text-base);
	}
	.funnel-bar-track {
		width: 100%;
		height: 20px;
		background-color: var(--bg-inset);
		border-radius: var(--radius-sm);
		overflow: hidden;
	}
	.funnel-bar {
		height: 100%;
		background-color: var(--primary);
		border-radius: var(--radius-sm);
		transition: width 0.4s ease;
	}
	.funnel-bar-final {
		background-color: var(--primary);
		opacity: 0.7;
	}
	.funnel-arrow {
		font-size: 0.75rem;
		color: var(--text-muted);
		padding: 0.1rem 0 0.1rem 0.5rem;
		font-weight: 600;
	}

	/* Best/Worst Day Analysis */
	.day-card {
		padding: 1.25rem;
	}
	.day-header {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}
	.day-best-block, .day-worst-block {
		text-align: center;
	}
	.day-best-block .day-name { color: var(--success); }
	.day-worst-block .day-name { color: var(--error); }
	.day-name {
		font-size: 1.2rem;
		font-weight: 700;
		margin-block: 0.15rem;
	}
	.day-avg {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text-base);
	}
	.day-avg .text-muted {
		font-weight: 400;
	}
	.day-vs {
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: lowercase;
	}
	.day-bars {
		display: flex;
		align-items: flex-end;
		justify-content: center;
		gap: 0.5rem;
		height: 80px;
		padding-top: 0.5rem;
		border-top: 1px solid var(--border-color);
	}
	.day-bar-col {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		flex: 1;
		height: 100%;
		justify-content: flex-end;
	}
	.day-bar-fill {
		width: 100%;
		max-width: 28px;
		background-color: var(--primary);
		border-radius: var(--radius-sm) var(--radius-sm) 0 0;
		transition: height 0.3s ease;
		min-height: 4px;
	}
	.day-bar-label {
		font-weight: 600;
	}
</style>
