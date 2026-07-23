<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';

	let { impressions = 0, pageViews = 0, installs = 0 } = $props<{
		impressions?: number;
		pageViews?: number;
		installs?: number;
	}>();

	function formatNum(val: number): string {
		return val.toLocaleString(undefined, { maximumFractionDigits: 0 });
	}

	function formatPct(val: number): string {
		return val.toFixed(1) + '%';
	}

	let maxVal = $derived(Math.max(impressions, pageViews, installs, 1));
	let ctr = $derived(impressions > 0 ? (pageViews / impressions) * 100 : null);
	let installRate = $derived(pageViews > 0 ? (installs / pageViews) * 100 : null);
	let overallRate = $derived(impressions > 0 ? (installs / impressions) * 100 : null);
</script>

<article class="card funnel-card">
	<header class="funnel-header">
		<div>
			<h3>Acquisition Conversion Funnel</h3>
			<p class="text-muted">Calculated conversion efficiency across store discovery, listing views, and installs.</p>
		</div>
		{#if overallRate !== null}
			<div class="funnel-summary-badge" title="Overall conversion rate from store impressions to installed extension">
				<Icon name="sparkle" />
				<span><strong>{formatPct(overallRate)}</strong> overall conversion</span>
			</div>
		{/if}
	</header>

	<div class="funnel-pipeline">
		<!-- Step 1: Impressions -->
		<div class="funnel-step">
			<div class="step-meta">
				<span class="step-label"><Icon name="compass" /> 1. Store Impressions</span>
				<strong class="step-value">{formatNum(impressions)}</strong>
			</div>
			<div class="bar-track">
				<div class="bar-fill step-impressions" style="width: {(impressions / maxVal) * 100}%"></div>
			</div>
		</div>

		<!-- Transition 1: CTR -->
		<div class="funnel-connector">
			<div class="connector-line"></div>
			<div class="connector-badge" title="Click-Through Rate: Page Views per Impression">
				<Icon name="arrow-right" />
				<span><strong>{ctr !== null ? formatPct(ctr) : '—'}</strong> CTR</span>
			</div>
			<div class="connector-line"></div>
		</div>

		<!-- Step 2: Page Views -->
		<div class="funnel-step">
			<div class="step-meta">
				<span class="step-label"><Icon name="storefront" /> 2. Store Page Views</span>
				<strong class="step-value">{formatNum(pageViews)}</strong>
			</div>
			<div class="bar-track">
				<div class="bar-fill step-page-views" style="width: {(pageViews / maxVal) * 100}%"></div>
			</div>
		</div>

		<!-- Transition 2: Install Rate -->
		<div class="funnel-connector">
			<div class="connector-line"></div>
			<div class="connector-badge" title="Install Rate: Installs per Page View">
				<Icon name="arrow-right" />
				<span><strong>{installRate !== null ? formatPct(installRate) : '—'}</strong> Install Rate</span>
			</div>
			<div class="connector-line"></div>
		</div>

		<!-- Step 3: Installs -->
		<div class="funnel-step">
			<div class="step-meta">
				<span class="step-label"><Icon name="cloud-arrow-up" /> 3. Installs</span>
				<strong class="step-value">{formatNum(installs)}</strong>
			</div>
			<div class="bar-track">
				<div class="bar-fill step-installs" style="width: {(installs / maxVal) * 100}%"></div>
			</div>
		</div>
	</div>
</article>

<style>
	.funnel-card {
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.funnel-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 1.25rem;
		flex-wrap: wrap;
	}

	.funnel-header h3 {
		margin: 0;
		font-size: 1.1rem;
	}

	.funnel-header p {
		margin: 0.25rem 0 0;
		font-size: 0.82rem;
	}

	.funnel-summary-badge {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.35rem 0.75rem;
		border-radius: var(--radius-md);
		background-color: var(--primary-bg, rgba(45, 102, 69, 0.1));
		color: var(--primary);
		font-size: 0.82rem;
		font-weight: 600;
	}

	.funnel-pipeline {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.funnel-step {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.step-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.85rem;
	}

	.step-label {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-weight: 600;
		color: var(--text-base);
	}

	.step-value {
		font-family: var(--font-mono, monospace);
		font-weight: 700;
	}

	.bar-track {
		height: 1.25rem;
		background: var(--bg-inset);
		border-radius: var(--radius-sm);
		overflow: hidden;
		position: relative;
	}

	.bar-fill {
		height: 100%;
		border-radius: var(--radius-sm);
		transition: width 0.3s ease;
	}

	.step-impressions {
		background: linear-gradient(90deg, #6366f1, #818cf8);
	}

	.step-page-views {
		background: linear-gradient(90deg, #0ea5e9, #38bdf8);
	}

	.step-installs {
		background: linear-gradient(90deg, var(--primary), #40925e);
	}

	.funnel-connector {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.2rem 0;
	}

	.connector-line {
		flex: 1;
		height: 1px;
		background-color: var(--border-color);
	}

	.connector-badge {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.2rem 0.6rem;
		border-radius: 999px;
		border: 1px solid var(--border-color);
		background-color: var(--bg-surface);
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.connector-badge strong {
		color: var(--text-base);
	}

	@media (max-width: 520px) {
		.funnel-header {
			flex-direction: column;
		}
	}
</style>
