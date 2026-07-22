<script lang="ts">
	import { calculateBreakdownRows, type BreakdownGroup } from '$lib/dashboard-metrics';

	let { group, days = 90 } = $props<{ group: BreakdownGroup; days: number | null }>();
	let expanded = $state(false);
	let rows = $derived(calculateBreakdownRows(group, days));
	let topRows = $derived(rows.slice(0, 8));
	let otherRows = $derived(rows.slice(8));
	let otherValue = $derived(otherRows.reduce((sum, row) => sum + row.value, 0));
	let chartRows = $derived(otherValue > 0
		? [...topRows, { name: 'Other', value: otherValue, share: otherRows.reduce((sum, row) => sum + row.share, 0), date: null }]
		: topRows);
	let maxValue = $derived(Math.max(...chartRows.map((row) => row.value), 1));
	let total = $derived(rows.reduce((sum, row) => sum + row.value, 0));
	let newestDate = $derived(rows.reduce<string | null>((latest, row) => row.date && (!latest || row.date > latest) ? row.date : latest, null));

	function formatNumber(value: number): string {
		return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
	}
</script>

<article class="card breakdown-card" data-report={group.id}>
	<header class="breakdown-header">
		<div>
			<h3>{group.title}</h3>
			<p class="text-muted source-line">{group.sourceName} · {group.semantics === 'snapshot' ? `Latest snapshot${newestDate ? ` (${newestDate})` : ''}` : 'Selected period'}</p>
		</div>
		<div class="breakdown-total">
			<strong>{formatNumber(total)}</strong>
			<span class="text-muted">{group.unitLabel}</span>
		</div>
	</header>

	{#if rows.length === 0}
		<p class="empty-breakdown text-muted">No data in this timeframe.</p>
	{:else}
		<div class="bar-list" role="img" aria-label="{group.title}. {rows.length} categories. Full values are available in the table below.">
			{#each chartRows as row}
				<div class="bar-row">
					<div class="bar-meta">
						<span class="bar-label" title={row.name}>{row.name}</span>
						<span class="bar-value">{formatNumber(row.value)} <small>{(row.share * 100).toFixed(1)}%</small></span>
					</div>
					<div class="bar-track" aria-hidden="true">
						<div class="bar-fill" style="width: {row.value > 0 ? Math.max((row.value / maxValue) * 100, 1.5) : 0}%"></div>
					</div>
				</div>
			{/each}
		</div>

		<button class="details-toggle" type="button" aria-expanded={expanded} onclick={() => expanded = !expanded}>
			{expanded ? 'Hide' : 'Show'} all {rows.length} categories
		</button>
		{#if expanded}
			<div class="table-scroll">
				<table>
					<thead><tr><th>Category</th><th>Value</th><th>Share</th><th>Date</th></tr></thead>
					<tbody>
						{#each rows as row}
							<tr><td>{row.name}</td><td>{formatNumber(row.value)}</td><td>{(row.share * 100).toFixed(2)}%</td><td>{row.date ?? '—'}</td></tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/if}
</article>

<style>
	.breakdown-card { padding: 1.25rem; min-width: 0; }
	.breakdown-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1rem; }
	h3 { font-size: 1rem; margin: 0; }
	.source-line { margin: 0.2rem 0 0; font-size: 0.72rem; }
	.breakdown-total { text-align: right; flex-shrink: 0; }
	.breakdown-total strong { display: block; font-size: 1.25rem; }
	.breakdown-total span { font-size: 0.72rem; }
	.bar-list { display: grid; gap: 0.7rem; }
	.bar-meta { display: flex; justify-content: space-between; gap: 1rem; font-size: 0.8rem; }
	.bar-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.bar-value { font-variant-numeric: tabular-nums; font-weight: 700; white-space: nowrap; }
	.bar-value small { color: var(--text-muted); font-weight: 500; }
	.bar-track { height: 8px; border-radius: 999px; background: var(--bg-inset); overflow: hidden; }
	.bar-fill { height: 100%; border-radius: inherit; background: var(--primary); }
	.details-toggle { margin-top: 1rem; border: 0; padding: 0; background: none; color: var(--primary); font: inherit; font-size: 0.8rem; font-weight: 700; cursor: pointer; }
	.table-scroll { overflow-x: auto; margin-top: 0.75rem; }
	table { width: 100%; border-collapse: collapse; font-size: 0.78rem; }
	th, td { padding: 0.5rem; border-bottom: 1px solid var(--border-color); text-align: left; }
	th:not(:first-child), td:not(:first-child) { text-align: right; font-variant-numeric: tabular-nums; }
	.empty-breakdown { min-height: 8rem; display: grid; place-items: center; }
	@media (max-width: 520px) {
		.breakdown-header { align-items: flex-start; }
		.breakdown-total strong { font-size: 1.05rem; }
	}
</style>
