<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	let { data } = $props();
</script>

<svelte:head>
	<title>Explore Extensions - KoalaData</title>
</svelte:head>

<div class="container discover-page">
	<h1 class="page-title"><Icon name="compass" /> Explore Extensions</h1>
	<p class="text-muted">Browse public browser extension projects registered in the ecosystem.</p>

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
					<div class="card explore-card flex flex-col justify-between">
						<div>
							<div class="flex align-center gap-1 card-title-row">
								{#if project.logoPath}
									<div class="mini-logo">
										<img src="/api/projects/{project.id}/logo" alt={project.name} />
									</div>
								{:else}
									<div class="mini-logo fallback-logo">
										<Icon name="paw-print" />
									</div>
								{/if}
								<h2 style="margin: 0; font-size: 1.15rem;">
									<a href="/p/{project.slug}">{project.name}</a>
								</h2>
							</div>
							<span class="badge badge-category">{project.category}</span>
							<p class="desc-text text-muted">{project.shortDescription}</p>
						</div>
						
						<div class="card-footer flex justify-between align-center">
							<a href="/p/{project.slug}" class="btn btn-secondary btn-sm">Inspect Charts</a>
							{#if project.storeUrl}
								<a href={project.storeUrl} target="_blank" rel="noopener" class="store-link text-muted">Store <Icon name="arrow-up-right" /></a>
							{/if}
						</div>
					</div>
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
	.filter-form { display: grid; grid-template-columns: minmax(0, 1fr) 200px auto auto; align-items: end; gap: 0.5rem; }
	.filter-form input, .filter-form select { margin-bottom: 0; }
	.explore-content { margin-top: 2rem; }

	.page-title {
		margin-bottom: 0.25rem;
	}

	.explore-grid {
		gap: 2rem;
	}

	.explore-card {
		min-height: 200px;
		padding: 1.5rem;
		transition: var(--transition-base);
	}
	.explore-card:hover {
		border-color: var(--primary-light);
		box-shadow: var(--shadow-md);
		transform: translateY(-2px);
	}

	.card-title-row {
		margin-bottom: 0.5rem;
	}

	.mini-logo {
		width: 32px;
		height: 32px;
		border-radius: 6px;
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
		font-size: 0.7rem;
		padding: 0.1rem 0.35rem;
		border-radius: var(--radius-sm);
		font-weight: 600;
		background-color: var(--primary-bg);
		color: var(--primary);
	}

	.desc-text {
		font-size: 0.85rem;
		line-height: 1.45;
		margin-top: 0.75rem;
		margin-bottom: 1.5rem;
	}

	.card-footer {
		border-top: 1px solid var(--border-color);
		padding-top: 0.75rem;
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
		.card-footer { flex-wrap: wrap; gap: 0.75rem; }
		.empty-state { padding: 2rem 1rem; }
	}
</style>
