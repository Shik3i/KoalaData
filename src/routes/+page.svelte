<script lang="ts">
	import ArrowRightIcon from 'phosphor-svelte/lib/ArrowRightIcon';
	import FolderOpenIcon from 'phosphor-svelte/lib/FolderOpenIcon';
	import SealCheckIcon from 'phosphor-svelte/lib/SealCheckIcon';
	import TrophyIcon from 'phosphor-svelte/lib/TrophyIcon';
	import ProjectBadges from '$lib/components/ProjectBadges.svelte';
	import { page } from '$app/state';
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
	<link rel="canonical" href={page.url.origin + '/'} />
	<meta property="og:title" content="KoalaData · Shareable Chrome Web Store analytics" />
	<meta property="og:description" content="Turn aggregate Chrome Web Store CSV exports into a transparent, shareable analytics dashboard—without extension telemetry." />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={page.url.origin + '/'} />
	<meta property="og:image" content={page.url.origin + '/og-fallback.png'} />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<div class="container homepage-container">
	<section class="hero card" aria-labelledby="hero-title">
		<div class="hero-copy">
			<p class="eyebrow">Chrome Web Store CSV analytics</p>
			<h1 id="hero-title">Turn store exports into a dashboard worth sharing.</h1>
			<p class="hero-subtitle">
				Upload aggregate Chrome Web Store reports, review every mapping, and publish clear
				install, user, region, language, version and rating trends—without adding tracking to your extension.
			</p>
			<div class="hero-actions">
				<a href="/register" class="btn btn-primary btn-lg">
					Publish my extension metrics <ArrowRightIcon class="app-icon" aria-hidden="true" />
				</a>
				<a href="/discover" class="btn btn-secondary btn-lg">Explore public dashboards</a>
			</div>
			<ul class="trust-list" aria-label="Platform benefits">
				<li><SealCheckIcon class="app-icon" weight="fill" aria-hidden="true" /> <a href="https://github.com/Shik3i/KoalaData" target="_blank" rel="noopener noreferrer">Open source on GitHub</a></li>
				<li><SealCheckIcon class="app-icon" weight="fill" aria-hidden="true" /> Self-hosted</li>
				<li><SealCheckIcon class="app-icon" weight="fill" aria-hidden="true" /> No extension telemetry</li>
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
						media="(max-width: 700px)"
						type="image/avif"
						srcset="/brand/koaladata-icon-180.avif"
					/>
					<source
						type="image/avif"
						srcset="/brand/koaladata-icon-180.avif 1x, /brand/koaladata-icon-360.avif 2x"
					/>
					<source
						media="(max-width: 700px)"
						type="image/webp"
						srcset="/brand/koaladata-icon-180.webp"
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
						fetchpriority="low"
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

	<section class="card how-section" aria-labelledby="how-title">
		<div class="section-heading">
			<div><p class="card-kicker">From export to evidence</p><h2 id="how-title">Three steps. No tracking SDK.</h2></div>
			<p>KoalaData processes aggregate reports already provided to publishers by the Chrome Web Store.</p>
		</div>
		<ol class="how-grid">
			<li><span>1</span><div><h3>Export reports</h3><p>Download installs, uninstalls, users, impressions and breakdown CSVs from the CWS statistics dashboard.</p></div></li>
			<li><span>2</span><div><h3>Review mappings</h3><p>Check report type, dates, aggregation, duplicates and overlaps before committing anything.</p></div></li>
			<li><span>3</span><div><h3>Share the dashboard</h3><p>Publish a reviewed profile with transparent metrics and normal crawlable links to your store, website, and source repository.</p></div></li>
		</ol>
	</section>

	<div class="grid grid-2 info-grid">
		<div class="card info-card">
			<div class="card-header flex align-center gap-1">
				<span class="info-icon"><FolderOpenIcon class="app-icon" weight="duotone" aria-hidden="true" /></span>
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
				Search directory <ArrowRightIcon class="app-icon" aria-hidden="true" />
			</a>
		</div>

		<div class="card info-card">
			<div class="card-header flex align-center gap-1">
				<span class="info-icon"><TrophyIcon class="app-icon" weight="duotone" aria-hidden="true" /></span>
				<div>
					<p class="card-kicker">Add context</p>
					<h2>Compare growth</h2>
				</div>
			</div>
			<p class="text-muted">
				See weekly installed-user growth over the last 30 days and compare momentum across the
				extension ecosystem with consistent ranking rules.
			</p>
			<a href="/leaderboards" class="btn btn-secondary btn-sm mt-1">
				See rankings <ArrowRightIcon class="app-icon" aria-hidden="true" />
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
				<a href="/leaderboards" class="section-link">View full leaderboard <ArrowRightIcon class="app-icon" aria-hidden="true" /></a>
			</div>
			<div class="peek-list">
				{#each data.leaderboard.slice(0, 3) as project, idx}
					<div class="peek-item flex justify-between align-center">
						<div class="flex align-center gap-1">
							<span class="rank-badge">#{idx + 1}</span>
							<div>
								<strong><a href="/p/{project.slug}">{project.name}</a></strong>
								<span class="badge badge-sm">{project.category}</span>
								<ProjectBadges pricingModel={project.pricingModel} isOpenSource={project.isOpenSource} />
								{#if project.rating !== null}<span class="metric-caption" aria-label={`${project.rating.toFixed(1)} out of 5 stars`}>★ {project.rating.toFixed(1)}</span>{/if}
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

	<section class="card faq-section" aria-labelledby="faq-title">
		<p class="card-kicker">Before you publish</p>
		<h2 id="faq-title">Common questions</h2>
		<div class="faq-grid">
			<details><summary>Does KoalaData track extension users?</summary><p>No. It imports aggregate publisher CSV reports and does not require code or an SDK inside your extension.</p></details>
			<details><summary>Which languages are supported?</summary><p>Automatic detection covers English, German, French, Spanish, Portuguese, Italian, Dutch, Polish and Turkish. Unknown formats can be mapped manually.</p></details>
			<details><summary>What does “verified” mean?</summary><p>An administrator reviewed the listing and supporting evidence. It is not an endorsement and never exposes the uploaded raw CSV publicly.</p></details>
			<details><summary>Can I prepare a dashboard privately?</summary><p>Yes. Start unlisted or private, review the complete dashboard, and request a public directory listing only when ready.</p></details>
			<details><summary>Are publisher links crawlable?</summary><p>Yes. Approved public profiles use ordinary links without <code>nofollow</code>. They can help people and search engines discover the official store, website, and source repository, but no ranking effect is guaranteed.</p></details>
		</div>
	</section>
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
	.trust-list a { color: inherit; font-weight: 650; text-decoration: underline; text-underline-offset: 0.18em; }

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
	.how-section, .faq-section { padding: 1.75rem; }
	.how-section .section-heading > p { max-width: 35rem; margin: 0; color: var(--text-muted); font-size: 0.88rem; line-height: 1.55; }
	.how-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin: 1.25rem 0 0; padding: 0; list-style: none; }
	.how-grid li { display: flex; gap: 0.8rem; padding: 1rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--bg-inset); }
	.how-grid li > span { display: grid; place-items: center; flex: 0 0 1.8rem; height: 1.8rem; border-radius: 50%; background: var(--primary); color: var(--text-inverse); font-weight: 800; }
	.how-grid h3 { margin: 0 0 0.35rem; font-size: 1rem; }
	.how-grid p { margin: 0; color: var(--text-muted); font-size: 0.8rem; line-height: 1.5; }
	.faq-section > h2 { margin: 0 0 1rem; }
	.faq-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; }
	.faq-grid details { padding: 0.9rem 1rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--bg-inset); }
	.faq-grid summary { cursor: pointer; font-weight: 700; }
	.faq-grid p { margin: 0.65rem 0 0; color: var(--text-muted); font-size: 0.82rem; line-height: 1.55; }

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
		.trust-list { justify-content: center; margin-top: 1.25rem; }
		.hero-visual { min-height: 12rem; margin-top: 0.25rem; }
		.hero-logo { width: 8rem; }
		.visual-grid { inset: 0 0.5rem; border-radius: 1.25rem; }
		.visual-card-installs { top: 0.5rem; left: 0; transform: scale(0.82); transform-origin: top left; }
		.visual-card-users { top: 0.75rem; right: 0; transform: scale(0.85); transform-origin: top right; }
		.visual-card-dimensions { right: 0; bottom: 0.35rem; transform: scale(0.82); transform-origin: bottom right; }
		.info-grid { gap: 1rem; }
		.how-grid, .faq-grid { grid-template-columns: 1fr; }
		.how-section .section-heading { align-items: flex-start; }
		.info-card, .peek-section { padding: 1.25rem; }
		.section-heading { align-items: flex-start; flex-direction: column; }
		.peek-item { align-items: flex-start; gap: 0.75rem; }
	}

	@media (prefers-reduced-motion: reduce) {
		.info-card { transition: none; }
		.info-card:hover { transform: none; }
	}
</style>
