<script lang="ts">
	import MetricChart from '$lib/components/MetricChart.svelte';
	import {
		calculateBreakdownRows,
		calculateBreakdownTimeline,
		type BreakdownGroup
	} from '$lib/dashboard-metrics';

	let { group, days = 90 } = $props<{ group: BreakdownGroup; days: number | null }>();
	let rows = $derived(calculateBreakdownRows(group, days));
	let timeline = $derived(calculateBreakdownTimeline(group, days));
	let total = $derived(rows.reduce((sum, row) => sum + row.value, 0));
	let maxValue = $derived(Math.max(...rows.map((row) => row.value), 1));

	const STAR_COLORS: Record<number, string> = {
		1: '#c84e46',
		2: '#d97706',
		3: '#d6a635',
		4: '#65a866',
		5: '#2f8f5b'
	};

	function starNumber(name: string): number {
		return Number(name.match(/[1-5]/)?.[0] ?? 0);
	}

	function starColor(name: string): string {
		return STAR_COLORS[starNumber(name)] ?? '#64748b';
	}

	let distributionRows = $derived([...rows].sort((a, b) => starNumber(b.name) - starNumber(a.name)));
	let timelineSeries = $derived([...timeline.series]
		.sort((a, b) => starNumber(a.name) - starNumber(b.name))
		.map((series) => ({ ...series, color: starColor(series.name) })));
</script>

<div class="rating-analytics">
	<article class="card rating-card">
		<header>
			<div><h3>Ratings received</h3><p class="text-muted">Total in selected period</p></div>
			<div class="rating-total"><strong>{total.toLocaleString()}</strong><span class="text-muted">ratings</span></div>
		</header>

		{#if total > 0}
			<div class="rating-bars" role="img" aria-label="Rating totals by star in the selected period">
				{#each distributionRows as row}
					<div class="rating-row">
						<div class="rating-meta"><span>{row.name}</span><strong>{row.value.toLocaleString()} <small>{(row.share * 100).toFixed(1)}%</small></strong></div>
						<div class="rating-track" aria-hidden="true"><div class="rating-fill" style:background={starColor(row.name)} style:width={`${row.value > 0 ? Math.max((row.value / maxValue) * 100, 1.5) : 0}%`}></div></div>
					</div>
				{/each}
			</div>
		{:else}
			<p class="empty-rating text-muted">No ratings received in this timeframe.</p>
		{/if}
	</article>

	<article class="card rating-card timeline-card">
		<header>
			<div><h3>Ratings over time</h3><p class="text-muted">Daily new ratings · one color per star</p></div>
		</header>
		{#if timeline.dates.length}
			<MetricChart title="ratings-over-time" seriesList={timelineSeries} categoryLabels={timeline.dates} />
		{:else}
			<p class="empty-rating text-muted">No rating history in this timeframe.</p>
		{/if}
	</article>
</div>

<style>
	.rating-analytics { display: grid; gap: 1rem; }
	.rating-card { padding: 1.25rem; min-width: 0; }
	.rating-card header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1rem; }
	h3 { margin: 0; font-size: 1rem; }
	header p { margin: 0.2rem 0 0; font-size: 0.72rem; }
	.rating-total { flex-shrink: 0; text-align: right; }
	.rating-total strong { display: block; font-size: 1.25rem; }
	.rating-total span { font-size: 0.72rem; }
	.rating-bars { display: grid; gap: 0.85rem; }
	.rating-row { display: grid; gap: 0.35rem; }
	.rating-meta { display: flex; justify-content: space-between; gap: 1rem; font-size: 0.85rem; }
	.rating-meta strong { font-variant-numeric: tabular-nums; }
	.rating-meta small { color: var(--text-muted); font-weight: 500; }
	.rating-track { height: 10px; overflow: hidden; border-radius: 999px; background: var(--bg-inset); }
	.rating-fill { height: 100%; border-radius: inherit; }
	.empty-rating { min-height: 8rem; display: grid; place-items: center; margin: 0; }

	@media (max-width: 520px) {
		.rating-card { padding: 1rem; }
		.rating-card header { flex-direction: column; gap: 0.5rem; }
		.rating-total { text-align: left; }
		.rating-total strong { font-size: 1.05rem; }
		.rating-meta { gap: 0.5rem; }
	}
</style>
