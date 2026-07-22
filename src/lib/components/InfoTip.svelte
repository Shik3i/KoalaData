<script lang="ts">
	import { tick } from 'svelte';

	let { id, text, label = 'More information' }: { id: string; text: string; label?: string } = $props();
	let open = $state(false);
	let triggerElement = $state<HTMLButtonElement>();
	let tooltipElement = $state<HTMLSpanElement>();
	let tooltipStyle = $state('');

	function positionTooltip() {
		if (!open || !triggerElement || !tooltipElement) return;
		const margin = 12;
		const gap = 8;
		const triggerRect = triggerElement.getBoundingClientRect();
		const tooltipRect = tooltipElement.getBoundingClientRect();
		const left = Math.min(
			window.innerWidth - tooltipRect.width - margin,
			Math.max(margin, triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2)
		);
		const above = triggerRect.top - tooltipRect.height - gap;
		const below = triggerRect.bottom + gap;
		const top = above >= margin
			? above
			: Math.min(below, window.innerHeight - tooltipRect.height - margin);
		tooltipStyle = `left: ${Math.round(left)}px; top: ${Math.max(margin, Math.round(top))}px; visibility: visible;`;
	}

	async function showTooltip() {
		tooltipStyle = 'left: 0; top: 0; visibility: hidden;';
		open = true;
		await tick();
		positionTooltip();
	}

	function hideTooltip() {
		open = false;
	}
</script>

<svelte:window onresize={positionTooltip} onscroll={positionTooltip} />

<span class="info-tip">
	<button
		bind:this={triggerElement}
		type="button"
		class="info-trigger"
		aria-label={label}
		aria-describedby={open ? id : undefined}
		aria-expanded={open}
		onfocus={showTooltip}
		onblur={hideTooltip}
		onmouseenter={showTooltip}
		onmouseleave={hideTooltip}
		onclick={showTooltip}
		onkeydown={(event) => { if (event.key === 'Escape') hideTooltip(); }}
	>?</button>
	{#if open}
		<span bind:this={tooltipElement} id={id} class="info-content" role="tooltip" style={tooltipStyle}>{text}</span>
	{/if}
</span>

<style>
	.info-tip { position: relative; display: inline-flex; vertical-align: middle; }
	.info-trigger {
		display: inline-grid;
		place-items: center;
		width: 1.15rem;
		height: 1.15rem;
		padding: 0;
		border: 1px solid var(--border-color);
		border-radius: 50%;
		background: var(--bg-inset);
		color: var(--text-muted);
		font: 700 0.7rem/1 system-ui;
		cursor: help;
	}
	.info-trigger:hover, .info-trigger:focus-visible { border-color: var(--primary); color: var(--primary); outline: none; }
	.info-content {
		position: fixed;
		z-index: 1000;
		width: min(17rem, calc(100vw - 1.5rem));
		padding: 0.65rem 0.75rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		background: var(--bg-surface);
		box-shadow: var(--shadow-lg);
		color: var(--text-base);
		font-size: 0.78rem;
		font-weight: 400;
		line-height: 1.45;
		text-align: left;
	}
</style>
