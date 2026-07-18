<script lang="ts">
	let { data } = $props();

	let activeTab = $state('explore'); // 'explore' or 'leaderboard'

	function formatNumber(num: number) {
		return num.toLocaleString();
	}
</script>

<svelte:head>
	<title>KoalaData - Browser Extension Directory & Analytics</title>
</svelte:head>

<div class="homepage-container">
	<!-- Hero Section -->
	<section class="hero card text-center">
		<h1>Discover Browser Extensions</h1>
		<p class="hero-subtitle text-muted">Analytics directory and growth rankings for self-hosted developer extensions.</p>

		<!-- Search Bar -->
		<form method="GET" class="hero-search flex align-center justify-center gap-1">
			<input 
				type="text" 
				name="q" 
				placeholder="Search extensions by name or keyword..." 
				value={data.searchQuery}
			/>
			<select name="category" value={data.categoryFilter}>
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
		</form>
	</section>

	<!-- Tabs Navigation -->
	<div class="tabs-card">
		<nav class="homepage-tabs flex align-center justify-center gap-2">
			<button 
				class="tab-btn {activeTab === 'explore' ? 'active' : ''}" 
				onclick={() => activeTab = 'explore'}
			>
				📁 Explore Directory ({data.exploreProjects.length})
			</button>
			<button 
				class="tab-btn {activeTab === 'leaderboard' ? 'active' : ''}" 
				onclick={() => activeTab = 'leaderboard'}
			>
				🏆 Growth Leaderboard ({data.leaderboard.length})
			</button>
		</nav>
	</div>

	<!-- Tab Panels -->
	<div class="tab-panels-content">
		<!-- Explore Panel -->
		{#if activeTab === 'explore'}
			<div class="explore-panel">
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
										<h3>
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
		{/if}

		<!-- Leaderboard Panel -->
		{#if activeTab === 'leaderboard'}
			<div class="leaderboard-panel card">
				<h2>Weekly Growth Leaderboard</h2>
				<p class="text-muted">Ranked by weekly active user growth over the last 30 days. Only approved, public extensions are ranked.</p>
				<hr class="divider" />

				{#if data.leaderboard.length === 0}
					<div class="empty-state text-center py-4">
						<span class="empty-icon">🏆</span>
						<h3>Leaderboard is empty</h3>
						<p class="text-muted">Extensions will appear here once approved by administrators and data is imported.</p>
					</div>
				{:else}
					<div class="table-wrapper">
						<table>
							<thead>
								<tr>
									<th>Rank</th>
									<th>Extension</th>
									<th>Weekly Active Users</th>
									<th>30-Day Growth</th>
									<th>Growth %</th>
								</tr>
							</thead>
							<tbody>
								{#each data.leaderboard as project, idx}
									<tr>
										<td>
											<span class="rank-badge rank-{idx + 1}">{idx + 1}</span>
										</td>
										<td>
											<div class="flex align-center gap-1">
												{#if project.logoPath}
													<img src="/api/projects/{project.projectId}/logo" alt={project.name} class="tbl-logo" />
												{:else}
													<span class="tbl-logo fallback-tbl-logo">🐨</span>
												{/if}
												<div>
													<strong><a href="/p/{project.slug}">{project.name}</a></strong>
													<div class="text-muted" style="font-size: 0.75rem;">{project.category}</div>
												</div>
											</div>
										</td>
										<td>
											<strong>{formatNumber(project.activeUsers)}</strong>
										</td>
										<td>
											<span class="growth-text {project.growth >= 0 ? 'growth-up' : 'growth-down'}">
												{project.growth >= 0 ? '+' : ''}{formatNumber(project.growth)}
											</span>
										</td>
										<td>
											<span class="growth-badge {project.growthPercent >= 0 ? 'growth-up-bg' : 'growth-down-bg'}">
												{project.growthPercent >= 0 ? '+' : ''}{project.growthPercent.toFixed(1)}%
											</span>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.homepage-container {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		padding: 2rem 0;
	}

	.hero {
		padding: 3rem 2rem;
		background: linear-gradient(135deg, var(--bg-base) 0%, var(--primary-bg) 100%);
	}

	.hero h1 {
		font-size: 2.75rem;
		font-weight: 800;
		color: var(--text-base);
		margin-bottom: 0.5rem;
	}

	.hero-subtitle {
		font-size: 1.2rem;
		margin-bottom: 2rem;
	}

	.hero-search {
		width: 100%;
		max-width: 800px;
		margin: 0 auto;
	}
	.hero-search input, .hero-search select {
		margin-bottom: 0;
		height: 46px;
	}
	.hero-search input {
		flex: 1;
	}
	.hero-search select {
		width: 180px;
	}
	.hero-search button {
		height: 46px;
		padding: 0 1.5rem;
	}

	@media (max-width: 768px) {
		.hero-search {
			flex-direction: column;
			gap: 0.75rem;
		}
		.hero-search select, .hero-search button {
			width: 100%;
		}
	}

	.tabs-card {
		border-bottom: 1px solid var(--border-color);
		margin-top: 1rem;
	}

	.homepage-tabs {
		margin-bottom: -1px;
	}

	.tab-btn {
		background: none;
		border: none;
		padding: 0.75rem 1.5rem;
		font-weight: 700;
		color: var(--text-muted);
		font-size: 1.1rem;
		cursor: pointer;
		border-bottom: 3px solid transparent;
		transition: var(--transition-base);
	}
	.tab-btn:hover {
		color: var(--primary);
	}
	.tab-btn.active {
		color: var(--primary);
		border-bottom-color: var(--primary);
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
	.card-title-row h3 {
		font-size: 1.2rem;
		margin-bottom: 0;
	}
	.card-title-row a {
		color: var(--text-base);
	}
	.card-title-row a:hover {
		color: var(--primary);
		text-decoration: none;
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

	.leaderboard-panel {
		padding: 1.5rem;
	}
	.leaderboard-panel h2 {
		font-size: 1.35rem;
		margin-bottom: 0.25rem;
	}

	.divider {
		border: 0;
		border-top: 1px solid var(--border-color);
		margin: 1rem 0;
	}

	.table-wrapper {
		overflow-x: auto;
	}

	table {
		margin-bottom: 0;
	}

	th, td {
		padding: 1rem;
		vertical-align: middle;
	}

	.rank-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		font-weight: 800;
		font-size: 0.9rem;
		background-color: var(--bg-inset);
		color: var(--text-muted);
	}
	.rank-1 { background-color: #fdf5ea; color: #b37424; }
	.rank-2 { background-color: #f3f4f6; color: #4b5563; }
	.rank-3 { background-color: #fdf2f2; color: #9b1c1c; }

	.tbl-logo {
		width: 32px;
		height: 32px;
		border-radius: 6px;
		object-fit: cover;
		border: 1px solid var(--border-color);
	}
	.fallback-tbl-logo {
		background-color: var(--bg-inset);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 1.1rem;
	}

	.growth-text {
		font-weight: 700;
	}
	.growth-up { color: var(--success); }
	.growth-down { color: var(--error); }

	.growth-badge {
		font-size: 0.8rem;
		font-weight: 700;
		padding: 0.15rem 0.45rem;
		border-radius: var(--radius-sm);
	}
	.growth-up-bg { background-color: var(--success-bg); color: var(--success); }
	.growth-down-bg { background-color: var(--error-bg); color: var(--error); }

	.empty-state {
		padding: 4rem;
	}
	.empty-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
		display: block;
	}
</style>
