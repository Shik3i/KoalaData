<script lang="ts">
	let { id, text, label = 'More information' }: { id: string; text: string; label?: string } = $props();
	let open = $state(false);
</script>

<span class="info-tip">
	<button
		type="button"
		class="info-trigger"
		aria-label={label}
		aria-describedby={open ? id : undefined}
		aria-expanded={open}
		onfocus={() => open = true}
		onblur={() => open = false}
		onmouseenter={() => open = true}
		onmouseleave={() => open = false}
		onclick={() => open = true}
		onkeydown={(event) => { if (event.key === 'Escape') open = false; }}
	>?</button>
	{#if open}
		<span id={id} class="info-content" role="tooltip">{text}</span>
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
		position: absolute;
		z-index: 50;
		left: 50%;
		bottom: calc(100% + 0.5rem);
		width: min(17rem, 75vw);
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
		transform: translateX(-50%);
	}
</style>
