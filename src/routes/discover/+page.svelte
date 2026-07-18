<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Explore Extensions - KoalaData</title>
</svelte:head>

<div class="container discover-page">
	<h1 class="page-title">📁 Explore Extensions</h1>
	<p class="text-muted">Browse public browser extension projects registered in the ecosystem.</p>

	<!-- Search Panel -->
	<div class="card filter-card" style="margin-top: 1.5rem; padding: 1.5rem;">
		<form method="GET" class="flex align-center gap-1 flex-wrap">
			<input 
				type="text" 
				name="q" 
				placeholder="Search extensions by name or keyword..." 
				value={data.searchQuery}
				style="margin-bottom: 0; flex: 1;"
			/>
			<select name="category" value={data.categoryFilter} style="margin-bottom: 0; width: 200px;">
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
	<div class="explore-content" style="margin-top: 2rem;">
		{#if data.exploreProjects.length === 0}
			<div class="card empty-state text-center">
				<span class="empty-icon">🍃</span>
				<h3>No Extensions Found</h3>
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
										<span>🐨</span>
									</div>
								{/if}
								<h3 style="margin: 0; font-size: 1.15rem;">
									<a href="/p/{project.slug}">{project.name}</a>
								</h3>
							</div>
							<span class="badge badge-category">{project.category}</span>
							<p class="desc-text text-muted">{project.shortDescription}</p>
						</div>
						
						<div class="card-footer flex justify-between align-center">
							<a href="/p/{project.slug}" class="btn btn-secondary btn-sm">Inspect Charts</a>
							{#if project.storeUrl}
								<a href={project.storeUrl} target="_blank" rel="noopener" class="store-link text-muted">Store ➜</a>
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
		padding: 2rem 0;
	}

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

	.fallback-logo span {
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
</style>
