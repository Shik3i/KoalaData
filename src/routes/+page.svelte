<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	let { data } = $props();

	function formatNumber(num: number) {
		return num.toLocaleString();
	}
</script>

<svelte:head>
	<title>KoalaData - Open Extension Analytics</title>
	<meta
		name="description"
		content="Publish, explore, and compare verifiable browser extension metrics with an open, self-hosted analytics platform."
	/>
</svelte:head>

<div class="container homepage-container">
	<section class="hero card" aria-labelledby="hero-title">
		<div class="hero-copy">
			<p class="eyebrow">Open analytics for browser extensions</p>
			<h1 id="hero-title">See what is driving your extension's growth.</h1>
			<p class="hero-subtitle">
				Publish clear Chrome Web Store metrics. Compare installs, users, regions, languages,
				versions, and ratings without an opaque dashboard.
			</p>
			<div class="hero-actions">
				<a href="/discover" class="btn btn-primary btn-lg">
					Explore public metrics <Icon name="arrow-right" />
				</a>
				<a href="/leaderboards" class="btn btn-secondary btn-lg">Compare growth</a>
				<a href="/register" class="hero-register">Register your extension</a>
			</div>
			<ul class="trust-list" aria-label="Platform benefits">
				<li><Icon name="seal-check" weight="fill" /> Open source</li>
				<li><Icon name="seal-check" weight="fill" /> Self-hosted</li>
				<li><Icon name="seal-check" weight="fill" /> Verifiable reports</li>
			</ul>
		</div>

		<div class="hero-visual" aria-hidden="true">
			<div class="visual-grid"></div>
			<div class="visual-card visual-card-installs">
				<span>Installs</span>
				<i></i><i></i><i></i><i></i><i></i>
			</div>
			<span class="hero-logo">
				<picture>
					<source
						type="image/avif"
						srcset="/brand/koaladata-icon-180.avif 1x, /brand/koaladata-icon-360.avif 2x"
					/>
					<source
						type="image/webp"
						srcset="/brand/koaladata-icon-180.webp 1x, /brand/koaladata-icon-360.webp 2x"
					/>
					<img
						src="/brand/koaladata-icon-180.png"
						width="180"
						height="180"
						alt=""
						fetchpriority="high"
					/>
				</picture>
			</span>
			<div class="visual-card visual-card-users">
				<span>Weekly users</span>
				<strong>Live</strong>
			</div>
			<div class="visual-card visual-card-dimensions">
				<span>Regions</span>
				<span>Languages</span>
				<span>Versions</span>
			</div>
		</div>
	</section>

	<div class="grid grid-2 info-grid">
		<div class="card info-card">
			<div class="card-header flex align-center gap-1">
				<span class="info-icon"><Icon name="folder-open" weight="duotone" /></span>
				<div>
					<p class="card-kicker">Find the signal</p>
					<h2>Explore extensions</h2>
				</div>
			</div>
			<p class="text-muted">
				Search the public directory, inspect complete metric histories, and understand which
				markets, versions, and acquisition channels matter.
			</p>
			<a href="/discover" class="btn btn-secondary btn-sm mt-1">
				Search directory <Icon name="arrow-right" />
			</a>
		</div>

		<div class="card info-card">
			<div class="card-header flex align-center gap-1">
				<span class="info-icon"><Icon name="trophy" weight="duotone" /></span>
				<div>
					<p class="card-kicker">Add context</p>
					<h2>Compare growth</h2>
				</div>
			</div>
			<p class="text-muted">
				See weekly active user growth over the last 30 days and compare momentum across the
				extension ecosystem with consistent ranking rules.
			</p>
			<a href="/leaderboards" class="btn btn-secondary btn-sm mt-1">
				See rankings <Icon name="arrow-right" />
			</a>
		</div>
	</div>

	{#if data.leaderboard && data.leaderboard.length > 0}
		<section class="card peek-section">
			<div class="section-heading">
				<div>
					<p class="card-kicker">Updated from public reports</p>
					<h2>Trending extensions</h2>
				</div>
				<a href="/leaderboards" class="section-link">View full leaderboard <Icon name="arrow-right" /></a>
			</div>
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
							<div class="metric-caption">{formatNumber(project.activeUsers)} users</div>
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
		gap: 1.5rem;
		padding: 1.5rem 0 3rem;
	}

	.hero {
		display: grid;
		grid-template-columns: minmax(0, 1.15fr) minmax(18rem, 0.85fr);
		align-items: center;
		gap: clamp(2rem, 6vw, 5rem);
		min-height: 31rem;
		padding: clamp(2.25rem, 5vw, 4.5rem);
		background:
			radial-gradient(circle at 85% 20%, color-mix(in srgb, var(--primary) 18%, transparent), transparent 20rem),
			linear-gradient(145deg, var(--bg-surface), var(--primary-bg));
		box-shadow: var(--shadow-md);
		overflow: hidden;
	}

	.hero-copy {
		position: relative;
		z-index: 2;
		max-width: 42rem;
	}

	.eyebrow,
	.card-kicker {
		margin: 0 0 0.55rem;
		color: var(--primary);
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.hero h1 {
		max-width: 13ch;
		margin: 0;
		font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
		font-size: clamp(2.35rem, 5.2vw, 4.15rem);
		font-weight: 750;
		line-height: 1.02;
		letter-spacing: -0.045em;
	}

	.hero-subtitle {
		max-width: 39rem;
		margin: 1.25rem 0 1.6rem;
		color: var(--text-muted);
		font-size: clamp(1rem, 1.6vw, 1.15rem);
		line-height: 1.65;
	}

	.hero-actions {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.hero-register {
		padding: 0.65rem 0.25rem;
		font-size: 0.9rem;
		font-weight: 600;
		text-underline-offset: 0.2em;
	}

	.trust-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem 1.25rem;
		margin: 1.75rem 0 0;
		padding: 0;
		list-style: none;
		color: var(--text-muted);
		font-size: 0.8rem;
	}

	.trust-list li {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}

	.trust-list :global(svg) { color: var(--primary); }

	.hero-visual {
		position: relative;
		isolation: isolate;
		min-height: 22rem;
		display: grid;
		place-items: center;
	}

	.visual-grid {
		position: absolute;
		inset: 0;
		border: 1px solid color-mix(in srgb, var(--primary) 25%, var(--border-color));
		border-radius: 2rem;
		background-image:
			linear-gradient(color-mix(in srgb, var(--primary) 10%, transparent) 1px, transparent 1px),
			linear-gradient(90deg, color-mix(in srgb, var(--primary) 10%, transparent) 1px, transparent 1px);
		background-size: 2.5rem 2.5rem;
		transform: rotate(2deg);
	}

	.hero-logo {
		position: relative;
		z-index: 2;
		display: grid;
		place-items: center;
		width: clamp(9rem, 17vw, 11rem);
		aspect-ratio: 1;
		border: 1px solid color-mix(in srgb, var(--primary) 35%, var(--border-color));
		border-radius: 1.5rem;
		background: color-mix(in srgb, var(--bg-surface) 88%, transparent);
		box-shadow: var(--shadow-lg);
		backdrop-filter: blur(8px);
	}

	.hero-logo picture { display: contents; }
	.hero-logo img { width: 100%; height: 100%; object-fit: contain; }

	.visual-card {
		position: absolute;
		z-index: 3;
		border: 1px solid color-mix(in srgb, var(--primary) 25%, var(--border-color));
		border-radius: 0.8rem;
		background: color-mix(in srgb, var(--bg-surface) 92%, transparent);
		box-shadow: var(--shadow-md);
		color: var(--text-muted);
		font-size: 0.68rem;
		font-weight: 600;
		backdrop-filter: blur(10px);
	}

	.visual-card-installs {
		top: 2rem;
		left: -1rem;
		display: flex;
		align-items: flex-end;
		gap: 0.25rem;
		width: 8.5rem;
		height: 5rem;
		padding: 1.6rem 0.75rem 0.75rem;
	}

	.visual-card-installs span { position: absolute; top: 0.55rem; left: 0.75rem; }
	.visual-card-installs i { flex: 1; border-radius: 2px 2px 0 0; background: var(--primary); opacity: 0.75; }
	.visual-card-installs i:nth-of-type(1) { height: 32%; }
	.visual-card-installs i:nth-of-type(2) { height: 55%; }
	.visual-card-installs i:nth-of-type(3) { height: 45%; }
	.visual-card-installs i:nth-of-type(4) { height: 76%; }
	.visual-card-installs i:nth-of-type(5) { height: 100%; }

	.visual-card-users {
		top: 3.5rem;
		right: -1.2rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
	}

	.visual-card-users strong { color: var(--success); font-size: 0.7rem; }

	.visual-card-dimensions {
		right: -1rem;
		bottom: 2.2rem;
		display: grid;
		gap: 0.35rem;
		padding: 0.75rem;
	}

	.visual-card-dimensions span::before {
		content: '';
		display: inline-block;
		width: 0.45rem;
		height: 0.45rem;
		margin-right: 0.4rem;
		border-radius: 50%;
		background: var(--primary);
	}

	.info-grid { gap: 1.5rem; }

	.info-card {
		padding: 1.75rem;
		transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.info-card:hover {
		transform: translateY(-2px);
		border-color: color-mix(in srgb, var(--primary) 32%, var(--border-color));
		box-shadow: var(--shadow-md);
	}

	.info-card h2 { margin: 0; font-size: 1.35rem; }
	.info-card .card-kicker { margin-bottom: 0.1rem; }

	.info-icon {
		display: inline-grid;
		place-items: center;
		width: 2.75rem;
		height: 2.75rem;
		flex: 0 0 2.75rem;
		border-radius: 0.8rem;
		background: var(--primary-bg);
		color: var(--primary);
		font-size: 1.35rem;
	}

	.info-card > p {
		margin: 1.15rem 0 1.25rem;
		font-size: 0.95rem;
		line-height: 1.65;
	}

	.peek-section { padding: 1.75rem; }

	.section-heading {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.section-heading h2 { margin: 0; font-size: 1.4rem; }
	.section-heading .card-kicker { margin-bottom: 0.2rem; }
	.section-link { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.85rem; font-weight: 600; }

	.peek-list { display: flex; flex-direction: column; gap: 0.65rem; }

	.peek-item {
		padding: 0.9rem 1rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		background-color: var(--bg-inset);
	}

	.rank-badge { min-width: 2rem; color: var(--primary); font-size: 1.05rem; font-weight: 800; }
	.growth-label { font-weight: 700; }
	.growth-up { color: var(--success); }
	.metric-caption { color: var(--text-muted); font-size: 0.75rem; }

	.badge {
		margin-left: 0.5rem;
		padding: 0.1rem 0.35rem;
		border-radius: var(--radius-sm);
		background-color: var(--primary-bg);
		color: var(--primary);
		font-size: 0.75rem;
		font-weight: 600;
	}

	@media (max-width: 860px) {
		.hero {
			grid-template-columns: minmax(0, 1fr) minmax(14rem, 0.65fr);
			gap: 2rem;
			padding: 2.5rem;
		}
		.visual-card-installs { left: -0.5rem; }
		.visual-card-users, .visual-card-dimensions { right: -0.5rem; }
	}

	@media (max-width: 700px) {
		.homepage-container { gap: 1rem; padding: 0.75rem 0 1.5rem; }
		.hero { grid-template-columns: 1fr; min-height: 0; padding: 2rem 1rem 1.25rem; text-align: center; }
		.hero-copy { max-width: none; }
		.hero h1 { max-width: 15ch; margin-inline: auto; font-size: clamp(2.15rem, 10vw, 3rem); }
		.hero-subtitle { margin: 1rem auto 1.35rem; font-size: 1rem; line-height: 1.55; }
		.hero-actions { justify-content: center; }
		.hero-actions .btn { width: 100%; }
		.hero-register { width: 100%; }
		.trust-list { justify-content: center; margin-top: 1.25rem; }
		.hero-visual { min-height: 12rem; margin-top: 0.25rem; }
		.hero-logo { width: 8rem; }
		.visual-grid { inset: 0 0.5rem; border-radius: 1.25rem; }
		.visual-card-installs { top: 0.5rem; left: 0; transform: scale(0.82); transform-origin: top left; }
		.visual-card-users { top: 0.75rem; right: 0; transform: scale(0.85); transform-origin: top right; }
		.visual-card-dimensions { right: 0; bottom: 0.35rem; transform: scale(0.82); transform-origin: bottom right; }
		.info-grid { gap: 1rem; }
		.info-card, .peek-section { padding: 1.25rem; }
		.section-heading { align-items: flex-start; flex-direction: column; }
		.peek-item { align-items: flex-start; gap: 0.75rem; }
	}

	@media (prefers-reduced-motion: reduce) {
		.info-card { transition: none; }
		.info-card:hover { transform: none; }
	}
</style>
