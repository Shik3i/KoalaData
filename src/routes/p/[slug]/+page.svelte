<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import InfoTip from '$lib/components/InfoTip.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import MetricChart from '$lib/components/MetricChart.svelte';
	import BreakdownTabs from '$lib/components/BreakdownTabs.svelte';
	import RatingAnalytics from '$lib/components/RatingAnalytics.svelte';
	import ProjectBadges from '$lib/components/ProjectBadges.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import { buildProjectSchemas } from '$lib/seo';
	import {
		buildBreakdownGroups,
		classifyChromeReportLabel,
		filterObservationsByCalendarDays,
		metricDisplayValue,
		splitLegacyMetricName,
		type DashboardMetric,
		type DashboardObservation
	} from '$lib/dashboard-metrics';

	let { data } = $props();
	let project = $derived(data.project);
	let dateFilter = $state('90');
	let compareMode = $state(false);
	let showMovingAverage = $state(false);
	let copied = $state(false);
	let activeSection = $state('growth');
	let days = $derived(dateFilter === 'all' ? null : Number(dateFilter));
	let isIndexable = $derived(project.visibility === 'public' && project.moderationStatus === 'active');

	let metrics = $derived(data.metrics as DashboardMetric[]);
	let schemas = $derived(isIndexable
		? buildProjectSchemas(page.url.origin, project, metrics.map((metric) => metricLabel(metric)))
		: []);
	let breakdownGroups = $derived(buildBreakdownGroups(metrics));
	let acquisitionGroups = $derived(breakdownGroups.filter((group) => group.section === 'acquisition'));
	let audienceGroups = $derived(breakdownGroups.filter((group) => group.section === 'audience'));
	let retentionGroups = $derived(breakdownGroups.filter((group) => group.section === 'retention'));
	let qualityGroups = $derived(breakdownGroups.filter((group) => group.section === 'quality'));

	function formatNumber(value: number): string {
		return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
	}

	function formatDataDate(date: string): string {
		return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' })
			.format(new Date(`${date}T00:00:00Z`));
	}

	function latestDate(metric: DashboardMetric): string {
		return metric.observations.at(-1)?.date ?? '';
	}

	function primaryMetric(type: string): DashboardMetric | undefined {
		return metrics
			.filter((metric) => metric.metricType === type)
			.sort((a, b) => latestDate(b).localeCompare(latestDate(a)) || b.observations.length - a.observations.length)[0];
	}

	let installsMetric = $derived(primaryMetric('installs'));
	let uninstallsMetric = $derived(primaryMetric('uninstalls'));
	let usersMetric = $derived(primaryMetric('active_users'));
	let impressionsMetric = $derived(primaryMetric('store_impressions'));
	let pageViewsMetric = $derived(primaryMetric('store_page_views'));
	let primaryMetricIds = $derived(new Set([
		installsMetric?.metricId, uninstallsMetric?.metricId, usersMetric?.metricId,
		impressionsMetric?.metricId, pageViewsMetric?.metricId
	].filter(Boolean)));
	let additionalMetrics = $derived(metrics.filter((metric) => {
		if (metric.metricType === 'custom') return !classifyChromeReportLabel(splitLegacyMetricName(metric.name).reportLabel);
		return !primaryMetricIds.has(metric.metricId);
	}));

	function selectedObservations(metric: DashboardMetric | undefined): DashboardObservation[] {
		return metric ? filterObservationsByCalendarDays(metric.observations, days) : [];
	}

	let growthEndDate = $derived([installsMetric, uninstallsMetric]
		.filter(Boolean)
		.map((metric) => latestDate(metric!))
		.sort()
		.at(-1) ?? '');

	function shiftDate(date: string, dayOffset: number): string {
		const shifted = new Date(`${date}T00:00:00Z`);
		shifted.setUTCDate(shifted.getUTCDate() + dayOffset);
		return shifted.toISOString().slice(0, 10);
	}

	function growthPeriod(metric: DashboardMetric | undefined, offset = 0, fillMissing = false): DashboardObservation[] {
		if (!metric || !growthEndDate || days === null) return metric?.observations ?? [];
		const endDate = shiftDate(growthEndDate, -(offset * days));
		const startDate = shiftDate(endDate, -days + 1);
		const observations = metric.observations.filter((observation) => observation.date >= startDate && observation.date <= endDate);
		if (!fillMissing) return observations;
		const byDate = new Map(observations.map((observation) => [observation.date, observation.value]));
		return Array.from({ length: days }, (_, index) => {
			const date = shiftDate(startDate, index);
			return { date, value: byDate.get(date) ?? 0 };
		});
	}

	let selectedInstalls = $derived(growthPeriod(installsMetric));
	let selectedUninstalls = $derived(growthPeriod(uninstallsMetric));
	let selectedUsers = $derived(selectedObservations(usersMetric));
	let selectedImpressions = $derived(selectedObservations(impressionsMetric));
	let selectedPageViews = $derived(selectedObservations(pageViewsMetric));

	let kpis = $derived.by(() => {
		const installs = selectedInstalls.reduce((sum, observation) => sum + observation.value, 0);
		const uninstalls = selectedUninstalls.reduce((sum, observation) => sum + observation.value, 0);
		const users = selectedUsers.at(-1)?.value ?? null;
		const previousUsers = selectedUsers.at(-2)?.value ?? null;
		const impressions = selectedImpressions.reduce((sum, observation) => sum + observation.value, 0);
		const pageViews = selectedPageViews.reduce((sum, observation) => sum + observation.value, 0);
		return {
			installs,
			uninstalls,
			netInstalls: installs - uninstalls,
			users,
			usersDelta: users !== null && previousUsers !== null ? users - previousUsers : null,
			impressions,
			pageViews
		};
	});

	let lastUpdated = $derived(metrics
		.flatMap((metric) => metric.observations)
		.reduce<string | null>((latest, observation) => !latest || observation.date > latest ? observation.date : latest, null));

	function compareSeries(metric: DashboardMetric | undefined, name: string, color: string) {
		if (!metric) return [];
		const current = growthPeriod(metric, 0, compareMode && days !== null);
		if (!compareMode || days === null) return [{ name, color, observations: current }];
		const previous = growthPeriod(metric, 1, true);
		return [
			{ name: `${name} · previous`, color: '#7f8c83', observations: previous },
			{ name: `${name} · current`, color, observations: current }
		];
	}

	let installUninstallSeries = $derived([
		...compareSeries(installsMetric, 'Installs', '#2d6645'),
		...compareSeries(uninstallsMetric, 'Uninstalls', '#c84e46')
	]);
	let comparisonLabels = $derived(compareMode && days !== null
		? Array.from({ length: days }, (_, index) => `Day ${index + 1}`)
		: undefined);

	let dayAnalysis = $derived.by(() => {
		if (selectedInstalls.length < 14) return [];
		const totals = Array.from({ length: 7 }, () => ({ sum: 0, count: 0 }));
		for (const observation of selectedInstalls) {
			const day = new Date(`${observation.date}T00:00:00Z`).getUTCDay();
			totals[day].sum += observation.value;
			totals[day].count++;
		}
		const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
		const calendarOrder = [1, 2, 3, 4, 5, 6, 0];
		return calendarOrder.map((day) => ({
			name: names[day],
			short: names[day].slice(0, 3),
			value: totals[day].count ? totals[day].sum / totals[day].count : 0,
			count: totals[day].count
		}));
	});

	let maxDayAverage = $derived(Math.max(...dayAnalysis.map((day) => day.value), 1));
	let bestDay = $derived(dayAnalysis.length ? [...dayAnalysis].sort((a, b) => b.value - a.value)[0] : null);
	let worstDay = $derived(dayAnalysis.length ? [...dayAnalysis].sort((a, b) => a.value - b.value)[0] : null);
	let installsRecord = $derived(installsMetric?.observations.reduce<DashboardObservation | null>(
		(record, observation) => !record || observation.value > record.value ? observation : record,
		null
	) ?? null);

	function metricLabel(metric: DashboardMetric): string {
		const labels: Record<string, string> = {
			active_users: 'Weekly Users', installs: 'Installs', uninstalls: 'Uninstalls',
			store_page_views: 'Store Page Views', store_impressions: 'Store Impressions'
		};
		return labels[metric.metricType] ?? metric.name;
	}

	onMount(() => {
		const sections = Array.from(document.querySelectorAll<HTMLElement>('.dashboard-section[id]'));
		const observer = new IntersectionObserver((entries) => {
			const visible = entries
				.filter((entry) => entry.isIntersecting)
				.sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
			if (visible?.target.id) activeSection = visible.target.id;
		}, { rootMargin: '-18% 0px -65% 0px', threshold: [0, 0.1, 0.35] });
		sections.forEach((section) => observer.observe(section));
		return () => observer.disconnect();
	});
</script>

<Seo
	title={`${project.name} Chrome Web Store Analytics | KoalaData`}
	description={project.shortDescription}
	canonicalPath={`/p/${project.slug}`}
	imagePath={`/p/${project.slug}/og.png`}
	imageAlt={`${project.name} analytics on KoalaData`}
	noindex={!isIndexable}
	{schemas}
/>

<div class="container public-dashboard">
	<header class="project-hero card">
		<div class="hero-main">
			<div class="identity">
				<div class="project-logo">
					{#if project.logoPath}<img src="/api/projects/{project.id}/logo" alt="{project.name} logo" />{:else}<Icon name="paw-print" />{/if}
				</div>
				<div>
					<div class="eyebrow-row">
						<span class="badge">{project.category}</span>
						<ProjectBadges pricingModel={project.pricingModel} isOpenSource={project.isOpenSource} />
						{#if project.verificationStatus === 'verified'}<span class="badge verified"><Icon name="seal-check" /> Verified data <InfoTip id="verified-help" text="An administrator reviewed the listing and supporting evidence. Verification is not an endorsement, and raw CSV files remain private." /></span>{/if}
						{#if lastUpdated}<span class="badge freshness" title={`Latest imported observation: ${lastUpdated}`}>Data through {formatDataDate(lastUpdated)}</span>{/if}
					</div>
					<h1>{project.name}</h1>
					<p class="hero-description">{project.shortDescription}</p>
				</div>
			</div>
			<div class="hero-actions">
				{#if project.storeUrl}<a class="btn btn-primary" href={project.storeUrl} target="_blank" rel="noopener"><Icon name="storefront" /> Add to Chrome</a>{/if}
				{#if project.websiteUrl}<a class="btn btn-secondary" href={project.websiteUrl} target="_blank" rel="noopener"><Icon name="globe" /> Visit website</a>{/if}
				{#if project.repositoryUrl}<a class="source-link" href={project.repositoryUrl} target="_blank" rel="noopener"><Icon name="code" /> Source code</a>{/if}
				<button class="source-link share-button" type="button" onclick={async () => { await navigator.clipboard.writeText(page.url.origin + `/p/${project.slug}`); copied = true; setTimeout(() => copied = false, 1800); }}><Icon name="clipboard-text" /> {copied ? 'Copied' : 'Copy dashboard link'}</button>
				<a class="source-link" href="mailto:koalasync@koalastuff.net?subject={encodeURIComponent(`KoalaData listing report: ${project.name}`)}"><Icon name="warning" /> Report listing</a>
			</div>
		</div>
		{#if project.fullDescription}
			<details class="about-details"><summary>About {project.name}</summary><p>{project.fullDescription}</p></details>
		{/if}
	</header>

	<section class="analytics-intro" aria-labelledby="analytics-title">
		<div>
			<p class="section-kicker">{project.verificationStatus === 'verified' ? 'Verified aggregate Chrome Web Store data' : 'Aggregate Chrome Web Store data'}</p>
			<h2 id="analytics-title">Growth at a glance</h2>
			<p class="text-muted data-note">Counts are grouped by their real meaning. Period totals are used for flows; current values are used for snapshots.</p>
		</div>
		<div class="filter-panel" aria-label="Analytics timeframe">
			{#each [['7', '7D'], ['30', '30D'], ['90', '90D'], ['365', '1Y'], ['all', 'All']] as option}
				<button class:active={dateFilter === option[0]} aria-pressed={dateFilter === option[0]} onclick={() => dateFilter = option[0]}>{option[1]}</button>
			{/each}
		</div>
	</section>

	<section class="kpi-grid" aria-label="Key metrics">
		<article class="card kpi-card"><span>Weekly Users</span><strong>{kpis.users === null ? '—' : formatNumber(kpis.users)}</strong><small class:positive={kpis.usersDelta && kpis.usersDelta > 0} class:negative={kpis.usersDelta && kpis.usersDelta < 0}>{kpis.usersDelta === null ? 'Latest installed-user snapshot' : `${kpis.usersDelta > 0 ? '+' : ''}${formatNumber(kpis.usersDelta)} since previous snapshot`}</small></article>
		<article class="card kpi-card"><span>Installs</span><strong>{formatNumber(kpis.installs)}</strong><small>New and returning installs in period</small></article>
		<article class="card kpi-card"><span>Uninstalls</span><strong>{formatNumber(kpis.uninstalls)}</strong><small>Uninstalls in period</small></article>
		<article class="card kpi-card"><span>Net Installs</span><strong class:positive={kpis.netInstalls > 0} class:negative={kpis.netInstalls < 0}>{kpis.netInstalls > 0 ? '+' : ''}{formatNumber(kpis.netInstalls)}</strong><small>Installs minus uninstalls</small></article>
		<article class="card kpi-card"><span>Store Page Views</span><strong>{formatNumber(kpis.pageViews)}</strong><small>Listing views, shown independently</small></article>
		<article class="card kpi-card"><span>Store Impressions</span><strong>{formatNumber(kpis.impressions)}</strong><small>Store discovery impressions</small></article>
	</section>

	<nav class="section-nav" aria-label="Analytics sections">
		<a href="#growth" class:active={activeSection === 'growth'} aria-current={activeSection === 'growth' ? 'location' : undefined}>Growth</a>{#if acquisitionGroups.length}<a href="#acquisition" class:active={activeSection === 'acquisition'} aria-current={activeSection === 'acquisition' ? 'location' : undefined}>Acquisition</a>{/if}{#if audienceGroups.length}<a href="#audience" class:active={activeSection === 'audience'} aria-current={activeSection === 'audience' ? 'location' : undefined}>Audience</a>{/if}{#if retentionGroups.length}<a href="#retention" class:active={activeSection === 'retention'} aria-current={activeSection === 'retention' ? 'location' : undefined}>Retention</a>{/if}{#if qualityGroups.length}<a href="#quality" class:active={activeSection === 'quality'} aria-current={activeSection === 'quality' ? 'location' : undefined}>Ratings</a>{/if}
	</nav>

	<section id="growth" class="dashboard-section">
		<div class="section-heading">
			<div><p class="section-kicker">Trends</p><h2>Growth and demand</h2><p class="text-muted">Daily movement and weekly installed-user snapshots without mixing incompatible funnels.</p></div>
			<div class="analysis-controls">
				<button class="btn btn-secondary btn-sm" class:active={compareMode} aria-pressed={compareMode} disabled={days === null} onclick={() => compareMode = !compareMode}><Icon name="clock-counter-clockwise" /> Compare previous period</button>
				<button class="btn btn-secondary btn-sm" class:active={showMovingAverage} aria-pressed={showMovingAverage} onclick={() => showMovingAverage = !showMovingAverage}><Icon name="chart-line" /> 7-day average</button>
			</div>
		</div>

		<div class="trend-grid">
			{#if installsMetric || uninstallsMetric}
				<article class="card chart-card wide">
					<header><div><h3>Daily Installs and Uninstalls</h3><p class="text-muted">{installsMetric?.sourceName ?? uninstallsMetric?.sourceName}</p></div><strong>{formatNumber(kpis.netInstalls)} net</strong></header>
					<MetricChart title="{project.name}-installs-uninstalls" seriesList={installUninstallSeries} categoryLabels={comparisonLabels} showMovingAverage={showMovingAverage} />
				</article>
			{/if}
			{#if usersMetric}
				<article class="card chart-card"><header><div><h3>Weekly Users</h3><p class="text-muted">Installed users, not activity telemetry</p></div><strong>{formatNumber(kpis.users ?? 0)}</strong></header><MetricChart title="{project.name}-weekly-users" observations={selectedUsers} /></article>
			{/if}
			{#if pageViewsMetric}
				<article class="card chart-card"><header><div><h3>Store Page Views</h3><p class="text-muted">Listing demand</p></div><strong>{formatNumber(kpis.pageViews)}</strong></header><MetricChart title="{project.name}-store-page-views" observations={selectedPageViews} showMovingAverage={showMovingAverage} /></article>
			{/if}
			{#if impressionsMetric}
				<article class="card chart-card"><header><div><h3>Store Impressions</h3><p class="text-muted">Store discovery</p></div><strong>{formatNumber(kpis.impressions)}</strong></header><MetricChart title="{project.name}-store-impressions" observations={selectedImpressions} showMovingAverage={showMovingAverage} /></article>
			{/if}
		</div>

		{#if dayAnalysis.length}
			<article class="card weekday-card">
				<header><div><h3>Installs by Weekday</h3><p class="text-muted">Calendar order · average per observed day</p></div><div class="weekday-summary"><span><b>{bestDay?.name}</b> strongest</span><span><b>{worstDay?.name}</b> weakest</span>{#if installsRecord}<span><b>{formatNumber(installsRecord.value)}</b> all-time daily high</span>{/if}</div></header>
				<div class="weekday-chart" role="img" aria-label="Average installs from Monday through Sunday">
					{#each dayAnalysis as day}
						<div class="weekday-column"><span class="weekday-value">{day.value.toFixed(1)}</span><div class="weekday-plot"><div class="weekday-bar" class:best={day.name === bestDay?.name} class:worst={day.name === worstDay?.name} style="height: {(day.value / maxDayAverage) * 100}%"></div></div><span class="weekday-label">{day.short}</span></div>
					{/each}
				</div>
			</article>
		{/if}
	</section>

	{#if acquisitionGroups.length}
		<section id="acquisition" class="dashboard-section"><div class="section-heading"><div><p class="section-kicker">Acquisition</p><h2>Where installs come from</h2><p class="text-muted">Choose one breakdown at a time. Every imported category remains available in the complete table.</p></div></div><BreakdownTabs groups={acquisitionGroups} {days} /></section>
	{/if}

	{#if audienceGroups.length}
		<section id="audience" class="dashboard-section"><div class="section-heading"><div><p class="section-kicker">Audience</p><h2>Installed-user distribution</h2><p class="text-muted">Explore the latest snapshot by version, language, operating system or region.</p></div></div><BreakdownTabs groups={audienceGroups} {days} /></section>
	{/if}

	{#if retentionGroups.length}
		<section id="retention" class="dashboard-section"><div class="section-heading"><div><p class="section-kicker">Retention signals</p><h2>Uninstalls and enabled state</h2><p class="text-muted">Uninstall flows use period totals. Enabled and disabled installations use only the latest snapshot.</p></div></div><BreakdownTabs groups={retentionGroups} {days} /></section>
	{/if}

	{#if qualityGroups.length}
		<section id="quality" class="dashboard-section"><div class="section-heading"><div><p class="section-kicker">Quality</p><h2>Rating activity</h2><p class="text-muted">Daily rating events shown as a period total and as a star-by-star timeline.</p></div></div>{#each qualityGroups as group}<RatingAnalytics {group} {days} />{/each}</section>
	{/if}

	{#if additionalMetrics.length}
		<section class="dashboard-section"><div class="section-heading"><div><p class="section-kicker">Additional data</p><h2>Other imported metrics</h2><p class="text-muted">Additional sources and unclassified custom data remain visible and are not discarded.</p></div></div><div class="trend-grid">{#each additionalMetrics as metric}<article class="card chart-card"><header><div><h3>{metricLabel(metric)}</h3><p class="text-muted">{metric.sourceName}</p></div><strong>{formatNumber(metricDisplayValue(metric, days) ?? 0)}</strong></header><MetricChart title="{project.name}-{metric.name}" observations={filterObservationsByCalendarDays(metric.observations, days)} /></article>{/each}</div></section>
	{/if}
</div>

<style>
	.public-dashboard { padding-block: clamp(1rem, 4vw, 2.5rem); display: grid; gap: clamp(1.5rem, 4vw, 3rem); }
	.project-hero { padding: clamp(1.25rem, 3vw, 2rem); overflow: hidden; position: relative; }
	.project-hero::after { content: ''; position: absolute; width: 18rem; height: 18rem; right: -8rem; top: -10rem; background: radial-gradient(circle, color-mix(in srgb, var(--primary) 16%, transparent), transparent 70%); pointer-events: none; }
	.hero-main { display: flex; justify-content: space-between; align-items: center; gap: 2rem; position: relative; z-index: 1; }
	.identity { display: flex; gap: 1rem; align-items: center; min-width: 0; }
	.project-logo { width: 72px; height: 72px; border-radius: 20px; flex: 0 0 auto; display: grid; place-items: center; overflow: hidden; border: 1px solid var(--border-color); background: var(--bg-inset); font-size: 2rem; }
	.project-logo img { width: 100%; height: 100%; object-fit: cover; }
	.eyebrow-row { display: flex; gap: 0.45rem; flex-wrap: wrap; margin-bottom: 0.45rem; }
	.badge { display: inline-flex; align-items: center; gap: 0.25rem; border-radius: 999px; padding: 0.18rem 0.55rem; background: var(--bg-inset); color: var(--text-muted); font-size: 0.7rem; font-weight: 700; text-transform: capitalize; }
	.badge.verified { color: var(--success); background: var(--success-bg); }
	.badge.freshness { border: 1px solid var(--border-color); text-transform: none; }
	h1 { margin: 0; font-size: clamp(1.8rem, 4vw, 2.5rem); }
	.hero-description { max-width: 48rem; margin: 0.35rem 0 0; color: var(--text-muted); font-size: 1rem; }
	.hero-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 0.65rem; min-width: 14rem; }
	.source-link { width: 100%; text-align: right; font-size: 0.8rem; font-weight: 600; }
	.share-button { padding: 0; border: 0; background: transparent; color: var(--primary); cursor: pointer; }
	.about-details { border-top: 1px solid var(--border-color); margin-top: 1.5rem; padding-top: 1rem; position: relative; z-index: 1; }
	.about-details summary { cursor: pointer; font-weight: 700; }
	.about-details p { color: var(--text-muted); margin: 0.75rem 0 0; max-width: 70rem; white-space: pre-wrap; }
	.analytics-intro, .section-heading { display: flex; justify-content: space-between; align-items: flex-end; gap: 2rem; }
	.section-kicker { color: var(--primary); font-size: 0.72rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; margin: 0 0 0.35rem; }
	.analytics-intro h2, .section-heading h2 { margin: 0; }
	.data-note, .section-heading p:last-child { margin: 0.45rem 0 0; max-width: 48rem; font-size: 0.85rem; }
	.filter-panel { display: flex; background: var(--bg-inset); padding: 0.25rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); }
	.filter-panel button { border: 0; border-radius: 7px; background: transparent; color: var(--text-muted); min-height: 36px; padding: 0.35rem 0.7rem; font: inherit; font-size: 0.8rem; font-weight: 700; cursor: pointer; }
	.filter-panel button.active { background: var(--primary); color: var(--text-inverse); box-shadow: var(--shadow-sm); }
	.kpi-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
	.kpi-card { padding: 1.15rem; min-height: 124px; display: flex; flex-direction: column; justify-content: space-between; }
	.kpi-card > span { color: var(--text-muted); font-size: 0.72rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
	.kpi-card strong { font-family: var(--font-display); font-size: clamp(1.55rem, 4vw, 2rem); line-height: 1; }
	.kpi-card small { color: var(--text-muted); font-size: 0.75rem; }
	.positive { color: var(--success) !important; }
	.negative { color: var(--error) !important; }
	.section-nav { position: sticky; top: 0.75rem; z-index: 20; justify-self: center; display: flex; gap: 0.25rem; padding: 0.3rem; border: 1px solid var(--border-color); border-radius: 999px; background: color-mix(in srgb, var(--bg-surface) 92%, transparent); box-shadow: var(--shadow-sm); backdrop-filter: blur(12px); }
	.section-nav a { padding: 0.4rem 0.75rem; border-radius: 999px; color: var(--text-muted); font-size: 0.78rem; font-weight: 700; }
	.section-nav a:hover { background: var(--bg-inset); color: var(--text-base); text-decoration: none; }
	.section-nav a.active { background: var(--primary); color: var(--text-inverse); text-decoration: none; }
	.dashboard-section { display: grid; gap: 1.25rem; scroll-margin-top: 5rem; }
	.analysis-controls { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: flex-end; }
	.analysis-controls .active { background: var(--primary); color: var(--text-inverse); border-color: var(--primary); }
	.analysis-controls button:disabled { opacity: 0.45; cursor: not-allowed; }
	.trend-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1rem; align-items: start; }
	.chart-card { padding: 1.25rem; min-width: 0; }
	.chart-card.wide { grid-column: 1 / -1; }
	.chart-card header, .weekday-card header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 0.75rem; }
	.chart-card h3, .weekday-card h3 { font-size: 1rem; margin: 0; }
	.chart-card header p, .weekday-card header p { margin: 0.2rem 0 0; font-size: 0.72rem; }
	.chart-card header strong { font-size: 1.1rem; white-space: nowrap; }
	.weekday-card { padding: 1.25rem; }
	.weekday-summary { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 0.5rem 1rem; color: var(--text-muted); font-size: 0.72rem; }
	.weekday-summary b { color: var(--text-base); }
	.weekday-chart { height: 190px; display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: clamp(0.35rem, 2vw, 1rem); padding-top: 0.5rem; }
	.weekday-column { min-width: 0; display: grid; grid-template-rows: 1.25rem 1fr 1.25rem; text-align: center; }
	.weekday-value { font-size: 0.72rem; font-weight: 700; font-variant-numeric: tabular-nums; }
	.weekday-plot { display: flex; align-items: flex-end; justify-content: center; border-bottom: 1px solid var(--border-color); min-height: 0; }
	.weekday-bar { width: min(3rem, 70%); background: var(--primary); opacity: 0.72; border-radius: 6px 6px 0 0; min-height: 3px; }
	.weekday-bar.best { opacity: 1; }
	.weekday-bar.worst { background: var(--error); opacity: 0.75; }
	.weekday-label { padding-top: 0.3rem; color: var(--text-muted); font-size: 0.72rem; font-weight: 700; }
	@media (max-width: 820px) {
		.hero-main, .analytics-intro, .section-heading { align-items: flex-start; flex-direction: column; gap: 1rem; }
		.hero-actions { width: 100%; justify-content: flex-start; }
		.source-link { width: auto; text-align: left; align-self: center; }
		.kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
		.chart-card.wide { grid-column: auto; }
		.analysis-controls { justify-content: flex-start; }
	}
	@media (max-width: 520px) {
		.public-dashboard { gap: 2rem; }
		.identity { align-items: flex-start; }
		.project-logo { width: 52px; height: 52px; border-radius: 14px; }
		.hero-actions .btn { flex: 1 1 100%; }
		.kpi-grid { grid-template-columns: 1fr 1fr; gap: 0.65rem; }
		.kpi-card { min-height: 112px; padding: 0.9rem; }
		.kpi-card strong { max-width: 100%; overflow-wrap: anywhere; font-size: 1.35rem; }
		.section-nav { justify-self: stretch; overflow-x: auto; justify-content: flex-start; border-radius: var(--radius-md); }
		.section-nav a { white-space: nowrap; }
		.filter-panel { width: 100%; overflow-x: auto; }
		.filter-panel button { flex: 1; }
		.weekday-card header { flex-direction: column; }
		.chart-card, .weekday-card { padding: 1rem; }
		.chart-card header { flex-direction: column; gap: 0.35rem; }
		.chart-card header strong { white-space: normal; }
		.weekday-summary { justify-content: flex-start; }
		.weekday-chart { gap: 0.25rem; height: 160px; }
		.weekday-value, .weekday-label { font-size: 0.65rem; }
	}
	@media (max-width: 360px) {
		.project-logo { width: 44px; height: 44px; }
		.kpi-card { min-height: 106px; padding: 0.75rem; }
		.kpi-card > span, .kpi-card small { font-size: 0.68rem; }
		.filter-panel button { min-width: 2.8rem; padding-inline: 0.45rem; }
	}
</style>
