<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import InfoTip from '$lib/components/InfoTip.svelte';
	import ProjectBadges from '$lib/components/ProjectBadges.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import { page } from '$app/state';
	let { data } = $props();

	function formatUpdated(timestamp: number): string {
		return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(timestamp * 1000));
	}

	function formatNumber(value: number | null): string {
		return value === null ? '—' : value.toLocaleString();
	}
</script>

<Seo
	title="Explore Browser Extension Analytics | KoalaData"
	description="Browse approved public browser-extension dashboards with Chrome Web Store ratings, weekly users, installs, audience breakdowns, and growth history."
	canonicalPath="/discover"
	noindex={!data.site.publicDiscoveryEnabled || page.url.search.length > 0}
/>

<div class="container discover-page">
	<h1 class="page-title"><Icon name="compass" /> Explore Extensions</h1>
	<p class="text-muted">Browse approved public browser-extension dashboards.</p>

	<!-- Search Panel -->
	<div class="card filter-card">
		<form method="GET" class="filter-form">
			<label class="sr-only" for="extension-search">Search extensions</label>
			<input 
				type="text" 
				id="extension-search"
				name="q" 
				autocomplete="off"
				placeholder="Search extensions by name or keyword..." 
				value={data.searchQuery}
				class="search-input"
			/>
			<label class="sr-only" for="category-filter">Filter by category</label>
			<select id="category-filter" name="category" value={data.categoryFilter}>
				<option value="">All Categories</option>
				<option value="productivity">Productivity</option>
				<option value="entertainment">Entertainment</option>
				<option value="developer-tools">Developer Tools</option>
				<option value="accessibility">Accessibility</option>
				<option value="privacy">Privacy & Security</option>
				<option value="social">Social</option>
				<option value="shopping">Shopping</option>
				<option value="education">Education</option>
				<option value="other">Other</option>
			</select>
			<label class="sr-only" for="pricing-filter">Filter by pricing</label>
			<select id="pricing-filter" name="pricing" value={data.pricingFilter}>
				<option value="">All Pricing</option><option value="free">Free</option><option value="freemium">Freemium</option><option value="paid">Paid</option>
			</select>
			<label class="sr-only" for="sort-filter">Sort extensions</label>
			<select id="sort-filter" name="sort" value={data.sort}>
				<option value="name">Name</option><option value="rating">Highest Rating</option><option value="users">Most Weekly Users</option><option value="installs">Most Daily Installs</option><option value="updated">Recently Updated</option>
			</select>
			<label class="open-source-filter"><input type="checkbox" name="openSource" value="1" checked={data.openSourceFilter} /> Open Source</label>
			<button type="submit" class="btn btn-primary">Search</button>
			<a href="/discover" class="btn btn-secondary">Clear</a>
		</form>
	</div>

	<!-- Project Grid -->
	<div class="explore-content">
		{#if data.exploreProjects.length === 0}
			<div class="card empty-state text-center">
				<span class="empty-icon"><Icon name="leaf" /></span>
				<h2>No Extensions Found</h2>
				<p class="text-muted">Try adjusting your filters or search query.</p>
			</div>
		{:else}
			<div class="grid grid-3 explore-grid">
				{#each data.exploreProjects as project}
					<article class="card explore-card">
						<header class="project-card-header">
							<div class="project-identity">
								{#if project.logoPath}
									<div class="mini-logo">
										<img src="/api/projects/{project.id}/logo" alt={project.name} />
									</div>
								{:else}
									<div class="mini-logo fallback-logo">
										<Icon name="paw-print" />
									</div>
								{/if}
								<div class="project-heading">
									<h2><a href="/p/{project.slug}">{project.name}</a></h2>
									<p class="updated text-muted">Updated {formatUpdated(project.updatedAt)}</p>
								</div>
							</div>
							<div class="project-badge-row">
								<span class="badge badge-category">{project.category}</span>
								<ProjectBadges pricingModel={project.pricingModel} isOpenSource={project.isOpenSource} />
								{#if project.verificationStatus === 'verified'}
									<span class="badge badge-verified">Verified <InfoTip id={`verified-${project.id}`} text="The listing and supporting evidence were reviewed by an administrator. This is not an endorsement." /></span>
								{/if}
							</div>
						</header>

						<p class="desc-text text-muted">{project.shortDescription}</p>

						<dl class="quick-stats" aria-label={`${project.name} key metrics`}>
							<div><dt>Rating</dt><dd aria-label={project.rating === null ? 'No rating data' : `${project.rating.toFixed(1)} out of 5 stars`}>{project.rating === null ? '—' : `★ ${project.rating.toFixed(1)}`}</dd></div>
							<div><dt>Weekly users</dt><dd>{formatNumber(project.activeUsers)}</dd></div>
							<div><dt>Daily installs</dt><dd>{formatNumber(project.installs)}</dd></div>
						</dl>

						<footer class="card-footer">
							<a href="/p/{project.slug}" class="btn btn-secondary btn-sm">Inspect charts</a>
							{#if project.storeUrl}
								<a href={project.storeUrl} target="_blank" rel="noopener" class="store-link text-muted">Store <Icon name="arrow-up-right" /></a>
							{/if}
						</footer>
					</article>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.discover-page {
		padding-block: 2rem;
	}
	.filter-card { margin-top: 1.5rem; }
	.filter-form { display: grid; grid-template-columns: minmax(12rem, 1fr) repeat(3, minmax(9rem, auto)) auto auto auto; align-items: center; gap: 0.5rem; }
	.filter-form input, .filter-form select { margin-bottom: 0; }
	.open-source-filter { display: inline-flex; align-items: center; gap: 0.4rem; white-space: nowrap; font-size: 0.85rem; font-weight: 650; }
	.open-source-filter input { width: 1rem; height: 1rem; }
	.explore-content { margin-top: 2rem; }

	.page-title {
		margin-bottom: 0.25rem;
	}

	.explore-grid {
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 22rem), 1fr));
		gap: 1.25rem;
		align-items: stretch;
	}
	.quick-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.5rem; margin: auto 0 0; }
	.quick-stats div { min-width: 0; padding: 0.7rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: var(--bg-inset); }
	.quick-stats dt { color: var(--text-muted); font-size: 0.7rem; line-height: 1.25; }
	.quick-stats dd { margin: 0.2rem 0 0; font-size: 0.95rem; font-weight: 750; font-variant-numeric: tabular-nums; }
	@media (max-width: 1100px) { .filter-form { grid-template-columns: repeat(2, minmax(0, 1fr)); } }

	.explore-card {
		display: flex;
		min-width: 0;
		min-height: 19rem;
		padding: 1.25rem;
		flex-direction: column;
		transition: var(--transition-base);
	}
	.explore-card:hover {
		border-color: var(--primary-light);
		box-shadow: var(--shadow-md);
		transform: translateY(-2px);
	}

	.project-card-header {
		display: grid;
		gap: 0.85rem;
	}
	.project-identity {
		display: flex;
		min-width: 0;
		align-items: center;
		gap: 0.8rem;
	}
	.project-heading {
		min-width: 0;
	}
	.project-heading h2 {
		margin: 0;
		font-size: 1.15rem;
		line-height: 1.25;
	}
	.project-heading h2 a {
		display: block;
		overflow-wrap: anywhere;
	}

	.mini-logo {
		width: 2.75rem;
		height: 2.75rem;
		flex: 0 0 2.75rem;
		border-radius: 0.65rem;
		overflow: hidden;
		background-color: var(--bg-inset);
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--border-color);
	}
	.mini-logo img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.fallback-logo :global(.app-icon) {
		font-size: 1.1rem;
	}

	.badge-category {
		display: inline-flex;
		align-items: center;
		min-height: 1.5rem;
		padding: 0.16rem 0.55rem;
		border-radius: 999px;
		font-size: 0.72rem;
		font-weight: 700;
		line-height: 1;
		text-transform: capitalize;
		background-color: var(--primary-bg);
		color: var(--primary);
	}
	.project-badge-row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; }
	.badge-verified { display: inline-flex; align-items: center; min-height: 1.5rem; gap: 0.25rem; padding: 0.16rem 0.55rem; border-radius: 999px; font-size: 0.72rem; font-weight: 700; line-height: 1; background: var(--success-bg); color: var(--success); }
	.updated { margin: 0.2rem 0 0; font-size: 0.72rem; line-height: 1.3; }

	.desc-text {
		font-size: 0.85rem;
		line-height: 1.45;
		margin: 1rem 0 1.25rem;
	}

	.card-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		border-top: 1px solid var(--border-color);
		padding-top: 1rem;
		margin-top: 1rem;
		font-size: 0.8rem;
	}

	.store-link {
		font-weight: 600;
	}

	.empty-state {
		padding: 4rem;
	}
	.empty-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
		display: block;
	}

	@media (max-width: 700px) {
		.discover-page { padding-block: 0.5rem 1.5rem; }
		.filter-form { grid-template-columns: minmax(0, 1fr); }
		.filter-form .btn { width: 100%; }
		.explore-grid { gap: 1rem; }
		.explore-card { min-height: 0; padding: 1rem; }
		.card-footer { flex-wrap: wrap; }
		.empty-state { padding: 2rem 1rem; }
	}
	@media (max-width: 380px) {
		.quick-stats { grid-template-columns: minmax(0, 1fr); }
	}
</style>
