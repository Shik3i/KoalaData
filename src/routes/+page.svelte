<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	let { data } = $props();

	function formatNumber(num: number) {
		return num.toLocaleString();
	}
</script>

<svelte:head>
	<title>KoalaData - Open Extension Metrics Platform</title>
</svelte:head>

<div class="container homepage-container">
	<!-- Hero Section -->
	<section class="hero card text-center">
		<span class="hero-logo">
			<img src="/brand/koaladata-icon.png" alt="" aria-hidden="true" />
		</span>
		<h1>KoalaData Analytics Hub</h1>
		<p class="hero-subtitle text-muted">
			Self-hosted open metrics, growth directories, and active ranks for browser extension developers.
		</p>
		<div class="flex justify-center gap-1 flex-wrap">
			<a href="/discover" class="btn btn-primary btn-lg">Explore Directory</a>
			<a href="/leaderboards" class="btn btn-secondary btn-lg">View Leaderboard</a>
			<a href="/register" class="btn btn-secondary btn-lg">Register Extension</a>
		</div>
	</section>

	<!-- Main Features Grid -->
	<div class="grid grid-2 info-grid">
		<!-- Explore Directory Info -->
		<div class="card info-card">
			<div class="card-header flex align-center gap-1">
				<span class="info-icon"><Icon name="folder-open" weight="duotone" /></span>
				<h2>Explore Extensions</h2>
			</div>
			<p class="text-muted">
				Browse the public index of extensions, review project categories, find store/repository URLs, and inspect interactive timeseries charts.
			</p>
			<a href="/discover" class="btn btn-secondary btn-sm mt-1">Search Directory <Icon name="arrow-right" /></a>
		</div>

		<!-- Leaderboard Info -->
		<div class="card info-card">
			<div class="card-header flex align-center gap-1">
				<span class="info-icon"><Icon name="trophy" weight="duotone" /></span>
				<h2>Weekly Leaderboard</h2>
			</div>
			<p class="text-muted">
				Inspect extension user bases ranked dynamically by weekly active user growth over the last 30 days, using automated sparse observations filtering.
			</p>
			<a href="/leaderboards" class="btn btn-secondary btn-sm mt-1">See Rankings <Icon name="arrow-right" /></a>
		</div>
	</div>

	<!-- Top Ranked Sneak Peek -->
	{#if data.leaderboard && data.leaderboard.length > 0}
		<section class="card peek-section">
			<h2>Trending Extensions</h2>
			<p class="text-muted">Current growth frontrunners in the ecosystem.</p>
			<hr class="divider" />
			<div class="peek-list">
				{#each data.leaderboard.slice(0, 3) as project, idx}
					<div class="peek-item flex justify-between align-center">
						<div class="flex align-center gap-1">
							<span class="rank-badge">#{idx + 1}</span>
							<div>
								<strong><a href="/p/{project.slug}">{project.name}</a></strong>
								<span class="badge badge-sm">{project.category}</span>
							</div>
						</div>
						<div class="text-right">
							<div class="growth-label growth-up">+{formatNumber(project.growth)} WAU</div>
							<div class="text-muted" style="font-size: 0.75rem;">{formatNumber(project.activeUsers)} users</div>
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}
</div>

<style>
	.homepage-container {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		padding: 3rem 0;
	}

	.hero {
		padding: 4rem 2rem;
		background:
			radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--primary) 18%, transparent), transparent 22rem),
			linear-gradient(145deg, var(--bg-surface), var(--primary-bg));
		box-shadow: var(--shadow-md);
		overflow: hidden;
	}

	.hero-logo {
		width: 4.5rem;
		height: 4.5rem;
		display: inline-grid;
		place-items: center;
		margin-bottom: 1.25rem;
		border: 1px solid color-mix(in srgb, var(--primary) 32%, var(--border-color));
		border-radius: 1.4rem;
		background: color-mix(in srgb, var(--primary-bg) 84%, var(--bg-surface));
		color: var(--primary);
		box-shadow: var(--shadow-sm);
	}

	.hero-logo img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.hero h1 {
		font-size: clamp(2rem, 6vw, 3rem);
		font-weight: 800;
		color: var(--text-base);
		margin-bottom: 0.5rem;
	}

	.hero-subtitle {
		font-size: 1.25rem;
		margin-bottom: 2.5rem;
		max-width: 600px;
		margin-left: auto;
		margin-right: auto;
	}

	.info-grid {
		gap: 2rem;
	}

	.info-card {
		padding: 2rem;
		transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
	}
	.info-card:hover {
		transform: translateY(-2px);
		border-color: color-mix(in srgb, var(--primary) 32%, var(--border-color));
		box-shadow: var(--shadow-md);
	}
	.info-card h2 {
		margin-bottom: 0;
		font-size: 1.4rem;
	}
	.info-icon {
		width: 2.5rem;
		height: 2.5rem;
		display: inline-grid;
		place-items: center;
		border-radius: 0.8rem;
		background: var(--primary-bg);
		color: var(--primary);
		font-size: 1.4rem;
	}
	.info-card p {
		margin-top: 1rem;
		font-size: 0.95rem;
		line-height: 1.5;
	}

	.peek-section {
		padding: 2rem;
	}
	.peek-section h2 {
		font-size: 1.4rem;
		margin-bottom: 0.25rem;
	}

	.divider {
		border: 0;
		border-top: 1px solid var(--border-color);
		margin: 1rem 0;
	}

	.peek-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.peek-item {
		padding: 1rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		background-color: var(--bg-inset);
	}

	.rank-badge {
		font-weight: 800;
		color: var(--primary);
		font-size: 1.1rem;
	}

	.growth-label {
		font-weight: 700;
	}
	.growth-up {
		color: var(--success);
	}

	.badge {
		font-size: 0.75rem;
		padding: 0.1rem 0.35rem;
		border-radius: var(--radius-sm);
		background-color: var(--primary-bg);
		color: var(--primary);
		margin-left: 0.5rem;
		font-weight: 600;
	}

	@media (max-width: 640px) {
		.homepage-container { gap: 1rem; padding-block: 0.5rem 1.5rem; }
		.hero { padding: 2.5rem 1rem; }
		.hero-logo { font-size: 3rem; }
		.hero-subtitle { font-size: 1.05rem; margin-bottom: 1.5rem; }
		.hero .btn { width: 100%; }
		.info-grid { gap: 1rem; }
		.peek-section { padding: 1rem; }
		.peek-item { align-items: flex-start; gap: 0.75rem; }
	}
</style>
