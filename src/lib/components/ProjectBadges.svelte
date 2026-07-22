<script lang="ts">
	import { pricingModelLabel } from '$lib/project-classification';

	let { pricingModel, isOpenSource = false } = $props<{
		pricingModel: string;
		isOpenSource?: boolean | number;
	}>();

	let pricingLabel = $derived(pricingModelLabel(pricingModel));
</script>

{#if pricingLabel || isOpenSource}
	<span class="project-badges" aria-label="Extension business model">
		{#if pricingLabel}<span class="project-badge pricing-{pricingModel}">{pricingLabel}</span>{/if}
		{#if isOpenSource}<span class="project-badge open-source">Open Source</span>{/if}
	</span>
{/if}

<style>
	.project-badges { display: inline-flex; flex-wrap: wrap; gap: 0.35rem; vertical-align: middle; }
	.project-badge { display: inline-flex; align-items: center; min-height: 1.5rem; padding: 0.16rem 0.55rem; border: 1px solid var(--border); border-radius: 999px; font-size: 0.72rem; font-weight: 700; line-height: 1; white-space: nowrap; }
	.pricing-free { color: #166534; background: #dcfce7; border-color: #86efac; }
	.pricing-freemium { color: #854d0e; background: #fef9c3; border-color: #fde047; }
	.pricing-paid { color: #5b21b6; background: #ede9fe; border-color: #c4b5fd; }
	.open-source { color: #075985; background: #e0f2fe; border-color: #7dd3fc; }
	:global(html.dark) .pricing-free { color: #bbf7d0; background: #14532d; border-color: #15803d; }
	:global(html.dark) .pricing-freemium { color: #fef08a; background: #713f12; border-color: #a16207; }
	:global(html.dark) .pricing-paid { color: #ddd6fe; background: #4c1d95; border-color: #7c3aed; }
	:global(html.dark) .open-source { color: #bae6fd; background: #0c4a6e; border-color: #0369a1; }
</style>
