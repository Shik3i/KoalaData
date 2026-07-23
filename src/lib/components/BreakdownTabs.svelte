<script lang="ts">
	import BreakdownPanel from '$lib/components/BreakdownPanel.svelte';
	import type { BreakdownSummaryGroup } from '$lib/dashboard-metrics';

	let { groups, days = 90 } = $props<{ groups: BreakdownSummaryGroup[]; days: number | null }>();
	let selectedId = $state('');
	let selectedGroup = $derived(groups.find((group: BreakdownSummaryGroup) => group.id === selectedId) ?? groups[0]);

	$effect(() => {
		if (groups.length && !groups.some((group: BreakdownSummaryGroup) => group.id === selectedId)) {
			selectedId = groups[0].id;
		}
	});

	function tabLabel(title: string): string {
		return title
			.replace(/^Weekly Users by /, '')
			.replace(/^Users by /, '')
			.replace(/^Installs by /, '');
	}

	function panelId(id: string): string {
		return `breakdown-${id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
	}

	function tabId(id: string): string {
		return `${panelId(id)}-tab`;
	}
</script>

{#if selectedGroup}
	<div class="breakdown-stack">
		{#if groups.length > 1}
			<div class="breakdown-tabs" role="tablist" aria-label="Data breakdown">
				{#each groups as group}
					<button
						type="button"
						role="tab"
						id={tabId(group.id)}
						class:active={selectedGroup.id === group.id}
						aria-selected={selectedGroup.id === group.id}
						aria-controls={panelId(group.id)}
						onclick={() => selectedId = group.id}
					>
						{tabLabel(group.title)}
					</button>
				{/each}
			</div>
		{/if}

		{#each groups as group}
			<div id={panelId(group.id)} role="tabpanel" aria-labelledby={tabId(group.id)} hidden={selectedGroup.id !== group.id}>
				{#if selectedGroup.id === group.id}<BreakdownPanel {group} {days} />{/if}
			</div>
		{/each}
	</div>
{/if}

<style>
	.breakdown-stack { display: grid; gap: 0.75rem; min-width: 0; }
	.breakdown-tabs { justify-self: start; display: flex; flex-wrap: wrap; gap: 0.25rem; padding: 0.25rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--bg-inset); }
	.breakdown-tabs button { min-height: 36px; border: 0; border-radius: 7px; padding: 0.4rem 0.8rem; background: transparent; color: var(--text-muted); font: inherit; font-size: 0.8rem; font-weight: 700; cursor: pointer; }
	.breakdown-tabs button:hover { color: var(--text-base); }
	.breakdown-tabs button.active { background: var(--primary); color: var(--text-inverse); box-shadow: var(--shadow-sm); }
	.breakdown-tabs button:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }

	@media (max-width: 520px) {
		.breakdown-tabs { justify-self: stretch; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
	}
</style>
