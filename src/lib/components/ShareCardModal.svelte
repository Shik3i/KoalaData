<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';

	type ProjectData = {
		id: string;
		name: string;
		category: string;
		shortDescription: string;
		pricingModel?: string;
		isOpenSource?: boolean | number;
		logoPath?: string | null;
	};

	type KpiData = {
		users: number | null;
		installs: number;
		uninstalls: number;
		netInstalls: number;
		pageViews: number;
		impressions: number;
	};

	let { isOpen = false, onClose, project, kpis } = $props<{
		isOpen?: boolean;
		onClose?: () => void;
		project: ProjectData;
		kpis: KpiData;
	}>();

	let canvasRef: HTMLCanvasElement | undefined = $state();
	let cardTheme = $state<'dark' | 'light'>('dark');
	let downloading = $state(false);

	function formatNum(val: number | null | undefined): string {
		if (val === null || val === undefined || typeof val !== 'number' || Number.isNaN(val)) return '—';
		return val.toLocaleString('en-US', { maximumFractionDigits: 0 });
	}

	function renderCanvas() {
		if (!canvasRef) return;
		const canvas = canvasRef;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const width = 1200;
		const height = 630;
		canvas.width = width;
		canvas.height = height;

		const isDark = cardTheme === 'dark';

		// Background
		if (isDark) {
			const bgGradient = ctx.createRadialGradient(width / 2, height / 3, 50, width / 2, height / 2, 700);
			bgGradient.addColorStop(0, '#192b20');
			bgGradient.addColorStop(1, '#0c120e');
			ctx.fillStyle = bgGradient;
		} else {
			const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
			bgGradient.addColorStop(0, '#ffffff');
			bgGradient.addColorStop(1, '#f1f5f3');
			ctx.fillStyle = bgGradient;
		}
		ctx.fillRect(0, 0, width, height);

		// Outer Border
		ctx.strokeStyle = isDark ? '#23382b' : '#e2e8f0';
		ctx.lineWidth = 12;
		ctx.strokeRect(6, 6, width - 12, height - 12);

		// Header Section
		// Category Badge
		ctx.font = '700 16px Inter, system-ui, sans-serif';
		const categoryText = (project.category || 'Extension').toUpperCase();
		const categoryWidth = ctx.measureText(categoryText).width + 24;
		
		ctx.fillStyle = isDark ? 'rgba(120, 211, 151, 0.15)' : 'rgba(47, 109, 71, 0.1)';
		ctx.beginPath();
		ctx.roundRect(70, 70, categoryWidth, 32, 6);
		ctx.fill();

		ctx.fillStyle = isDark ? '#78d397' : '#2f6d47';
		ctx.fillText(categoryText, 82, 91);

		// Project Title
		ctx.font = '800 46px Inter, system-ui, sans-serif';
		ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
		ctx.fillText(project.name, 70, 155);

		// Description
		ctx.font = '400 20px Inter, system-ui, sans-serif';
		ctx.fillStyle = isDark ? '#9ca3af' : '#64748b';
		let desc = project.shortDescription || 'Chrome Web Store Analytics';
		if (desc.length > 80) desc = desc.slice(0, 77) + '...';
		ctx.fillText(desc, 70, 195);

		// KPI Grid (4 Cards)
		const cardY = 240;
		const cardW = 245;
		const cardH = 220;
		const gap = 20;

		const metricsList = [
			{ label: 'WEEKLY USERS', value: formatNum(kpis.users), color: isDark ? '#78d397' : '#2f6d47' },
			{ label: 'NET GROWTH', value: (kpis.netInstalls > 0 ? '+' : '') + formatNum(kpis.netInstalls), color: kpis.netInstalls >= 0 ? (isDark ? '#4ade80' : '#16a34a') : '#ef4444' },
			{ label: 'TOTAL INSTALLS', value: formatNum(kpis.installs), color: isDark ? '#38bdf8' : '#0284c7' },
			{ label: 'STORE PAGE VIEWS', value: formatNum(kpis.pageViews), color: isDark ? '#a78bfa' : '#7c3aed' }
		];

		metricsList.forEach((m, idx) => {
			const x = 70 + idx * (cardW + gap);
			
			// Card container
			ctx.fillStyle = isDark ? '#141d17' : '#ffffff';
			ctx.strokeStyle = isDark ? '#233328' : '#e2e8f0';
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.roundRect(x, cardY, cardW, cardH, 16);
			ctx.fill();
			ctx.stroke();

			// Metric Accent Top Line
			ctx.fillStyle = m.color;
			ctx.beginPath();
			ctx.roundRect(x + 20, cardY + 20, 36, 6, 3);
			ctx.fill();

			// Metric Label
			ctx.font = '700 13px Inter, system-ui, sans-serif';
			ctx.fillStyle = isDark ? '#6b7280' : '#94a3b8';
			ctx.fillText(m.label, x + 20, cardY + 60);

			// Metric Value
			ctx.font = '800 34px Inter, system-ui, sans-serif';
			ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
			ctx.fillText(m.value, x + 20, cardY + 120);
		});

		// Footer Watermark
		ctx.font = '600 18px Inter, system-ui, sans-serif';
		ctx.fillStyle = isDark ? '#6b7280' : '#94a3b8';
		ctx.fillText('Verified Privacy-First Analytics', 70, 560);

		ctx.font = '700 20px Inter, system-ui, sans-serif';
		ctx.fillStyle = isDark ? '#78d397' : '#2f6d47';
		ctx.fillText('data.koalastuff.net', width - 260, 560);
	}

	$effect(() => {
		if (isOpen) {
			void cardTheme;
			// Allow DOM to render canvas first
			setTimeout(() => renderCanvas(), 50);
		}
	});

	function downloadPNG() {
		if (!canvasRef) return;
		downloading = true;
		try {
			const link = document.createElement('a');
			link.download = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-koaladata-card.png`;
			link.href = canvasRef.toDataURL('image/png');
			link.click();
		} finally {
			downloading = false;
		}
	}
</script>

{#if isOpen}
	<div class="modal-backdrop" onclick={onClose} onkeydown={(e) => { if (e.key === 'Escape') onClose?.(); }} role="presentation">
		<div class="modal-card" onclick={(e) => e.stopPropagation()} tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="modal-title">
			<header class="modal-header">
				<h2 id="modal-title"><Icon name="sparkle" /> Shareable Stats Card Generator</h2>
				<button type="button" class="close-btn" onclick={onClose} aria-label="Close modal"><Icon name="x" /></button>
			</header>

			<div class="modal-body">
				<p class="text-muted">Export a high-resolution 1200x630 share card for Twitter/X, Reddit, or LinkedIn.</p>

				<div class="theme-picker">
					<span>Card Style:</span>
					<button class:active={cardTheme === 'dark'} type="button" onclick={() => { cardTheme = 'dark'; }}>Dark Theme</button>
					<button class:active={cardTheme === 'light'} type="button" onclick={() => { cardTheme = 'light'; }}>Light Theme</button>
				</div>

				<div class="canvas-preview-wrapper">
					<canvas bind:this={canvasRef} class="share-canvas"></canvas>
				</div>
			</div>

			<footer class="modal-footer">
				<button type="button" class="btn btn-secondary" onclick={onClose}>Close</button>
				<button type="button" class="btn btn-primary" onclick={downloadPNG} disabled={downloading}>
					<Icon name="cloud-arrow-up" /> {downloading ? 'Exporting...' : 'Download Image (1200x630 PNG)'}
				</button>
			</footer>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		backdrop-filter: blur(4px);
		display: grid;
		place-items: center;
		z-index: 1000;
		padding: 1rem;
	}

	.modal-card {
		background: var(--bg-surface);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		width: 100%;
		max-width: 850px;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid var(--border-color);
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.2rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.close-btn {
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		font-size: 1.25rem;
		padding: 0.25rem;
		display: flex;
		align-items: center;
	}

	.close-btn:hover {
		color: var(--text-base);
	}

	.modal-body {
		padding: 1.25rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.theme-picker {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
	}

	.theme-picker button {
		padding: 0.3rem 0.75rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-color);
		background: var(--bg-surface);
		color: var(--text-muted);
		cursor: pointer;
		font-size: 0.8rem;
		font-weight: 600;
	}

	.theme-picker button.active {
		background: var(--primary);
		color: #ffffff;
		border-color: var(--primary);
	}

	.canvas-preview-wrapper {
		width: 100%;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		overflow: hidden;
		background: #000;
	}

	.share-canvas {
		width: 100%;
		height: auto;
		display: block;
	}

	.modal-footer {
		padding: 1rem 1.5rem;
		border-top: 1px solid var(--border-color);
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		background: var(--bg-inset);
	}
</style>
