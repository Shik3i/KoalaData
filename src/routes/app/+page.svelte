<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	let { data } = $props();

	function formatBytes(bytes: number) {
		if (!Number.isFinite(bytes) || bytes <= 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
		const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	function formatDate(timestamp: number) {
		return new Date(timestamp * 1000).toLocaleDateString();
	}

	// Calculate percentages for limits bars
	let projectsPct = $derived(data.limits.maxProjects > 0 ? Math.min(100, (data.usage.projectsCount / data.limits.maxProjects) * 100) : 0);
	let storagePct = $derived(data.limits.maxStorageBytes > 0 ? Math.min(100, (data.usage.storageBytes / data.limits.maxStorageBytes) * 100) : 0);
</script>

<svelte:head>
	<title>Developer Workspace - KoalaData</title>
</svelte:head>

<div class="container app-dashboard">
	<!-- Dashboard Header -->
	<div class="flex justify-between align-center dashboard-header flex-wrap gap-2">
		<div>
			<h1>Developer Workspace</h1>
			<p class="text-muted">Welcome, {data.user.username}. Manage your extensions and imports.</p>
		</div>
		<div>
			<a href="/app/projects/new" class="btn btn-primary"><Icon name="plus" /> New Project</a>
		</div>
	</div>

	{#if !data.onboarding.hasPublicListing}
		<section class="card onboarding-card" aria-labelledby="onboarding-title">
			<div class="onboarding-heading">
				<div>
					<p class="onboarding-kicker">First dashboard</p>
					<h2 id="onboarding-title">Publish your first extension report</h2>
					<p>Follow the safe path from Chrome Web Store export to a reviewed public dashboard.</p>
				</div>
				<span class="onboarding-progress">{[data.onboarding.hasProject, data.onboarding.hasStoreConnection, data.onboarding.hasCompletedImport, data.onboarding.hasPublicListing].filter(Boolean).length}/4 complete</span>
			</div>
			<ol class="onboarding-steps">
				<li class:complete={data.onboarding.hasProject}>
					<span>{data.onboarding.hasProject ? '✓' : '1'}</span>
					<div><strong>Create the extension</strong><small>Add its name, store URL and visibility.</small></div>
					{#if !data.onboarding.hasProject}<a class="btn btn-primary btn-sm" href="/app/projects/new">Start</a>{/if}
				</li>
				<li class:complete={data.onboarding.hasStoreConnection}>
					<span>{data.onboarding.hasStoreConnection ? '✓' : '2'}</span>
					<div><strong>Connect the store listing</strong><small>A valid CWS URL creates the standard data source automatically.</small></div>
					{#if data.onboarding.hasProject && !data.onboarding.hasStoreConnection}<a class="btn btn-secondary btn-sm" href="/app/projects/{data.onboarding.projectId}/settings">Connect</a>{/if}
				</li>
				<li class:complete={data.onboarding.hasCompletedImport}>
					<span>{data.onboarding.hasCompletedImport ? '✓' : '3'}</span>
					<div><strong>Review and import CSV reports</strong><small>Mappings are previewed before metrics are committed.</small></div>
					{#if data.onboarding.hasSource && !data.onboarding.hasCompletedImport}<a class="btn btn-secondary btn-sm" href="/app/projects/{data.onboarding.projectId}/imports">Upload</a>{/if}
				</li>
				<li class:complete={data.onboarding.hasPublicListing}>
					<span>{data.onboarding.hasPublicListing ? '✓' : '4'}</span>
					<div><strong>Request public listing</strong><small>Preview the dashboard, then submit it for directory review.</small></div>
					{#if data.onboarding.hasCompletedImport && !data.onboarding.hasPublicListing}<a class="btn btn-secondary btn-sm" href="/app/projects/{data.onboarding.projectId}/settings">Request review</a>{/if}
				</li>
			</ol>
		</section>
	{/if}

	<!-- Limits & Usage Cards -->
	<div class="grid grid-2 limits-grid">
		<!-- Projects Limit -->
		<div class="card limit-card">
			<div class="flex justify-between align-center label-row">
				<span class="limit-label"><Icon name="folder-open" /> Project Limit</span>
				<span class="limit-ratio">{data.usage.projectsCount} of {data.limits.maxProjects}</span>
			</div>
			<div class="progress-bar-bg">
				<div class="progress-bar" style="width: {projectsPct}%;"></div>
			</div>
		</div>

		<!-- Storage Limit -->
		<div class="card limit-card">
			<div class="flex justify-between align-center label-row">
				<span class="limit-label"><Icon name="cloud" /> Storage Limit</span>
				<span class="limit-ratio">{formatBytes(data.usage.storageBytes)} of {formatBytes(data.limits.maxStorageBytes)}</span>
			</div>
			<div class="progress-bar-bg">
				<div class="progress-bar" style="width: {storagePct}%;"></div>
			</div>
		</div>
	</div>

	<!-- Main Workspace Grid -->
	<div class="workspace-layout">
		<!-- Projects List Section -->
		<section class="projects-section">
			<h2>My Projects</h2>
			<div class="projects-list">
				{#if data.projects.length === 0}
					<div class="card empty-state">
						<span class="empty-icon"><Icon name="folder-open" /></span>
						<h3>No Projects Yet</h3>
						<p>Get started by creating a project for your browser extension.</p>
						<a href="/app/projects/new" class="btn btn-primary btn-sm">Create First Project</a>
					</div>
				{:else}
					<div class="grid grid-2">
						{#each data.projects as project}
							<div class="card project-card flex flex-col justify-between">
								<div>
									<div class="flex align-center justify-between card-header">
										<h3 class="project-name">
											<a href="/app/projects/{project.id}">{project.name}</a>
										</h3>
										<span class="badge badge-visibility-{project.visibility}">{project.visibility}</span>
									</div>
									<p class="project-desc text-muted">{project.shortDescription || 'No description provided.'}</p>
								</div>
								<div class="project-footer flex justify-between align-center text-muted">
									<span>Slug: <code>{project.slug}</code></span>
									<a href="/app/projects/{project.id}" class="btn btn-secondary btn-sm">Manage</a>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</section>

		<!-- Recent Imports Sidebar -->
		<aside class="imports-sidebar">
			<h2>Recent Imports</h2>
			<div class="card imports-card">
				{#if data.recentImports.length === 0}
					<p class="text-muted text-center py-2">No imports uploaded yet.</p>
				{:else}
					<ul class="imports-list-links">
						{#each data.recentImports as batch}
							<li class="import-item flex justify-between align-center">
								<div>
									<div class="import-file" title={batch.originalFilename}>{batch.originalFilename}</div>
									<div class="import-meta text-muted">
										<span>{formatDate(batch.createdAt)}</span>
										<span>•</span>
										<span>{batch.rowCount} rows</span>
									</div>
								</div>
								<div>
									<span class="badge badge-status-{batch.status}">{batch.status}</span>
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</aside>
	</div>
</div>

<style>
	.app-dashboard {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}
	.onboarding-card { padding: 1.5rem; background: linear-gradient(145deg, var(--bg-surface), var(--primary-bg)); }
	.onboarding-heading { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; }
	.onboarding-heading h2 { margin: 0.1rem 0 0.35rem; font-size: 1.35rem; }
	.onboarding-heading p { margin: 0; color: var(--text-muted); font-size: 0.88rem; }
	.onboarding-kicker { color: var(--primary) !important; font-size: 0.7rem !important; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
	.onboarding-progress { flex: 0 0 auto; padding: 0.3rem 0.6rem; border-radius: 999px; background: var(--bg-surface); color: var(--primary); font-size: 0.75rem; font-weight: 700; }
	.onboarding-steps { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.75rem; margin: 1.25rem 0 0; padding: 0; list-style: none; }
	.onboarding-steps li { display: grid; grid-template-columns: auto 1fr; align-content: start; gap: 0.65rem; min-width: 0; padding: 0.9rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: color-mix(in srgb, var(--bg-surface) 90%, transparent); }
	.onboarding-steps li > span { display: grid; place-items: center; width: 1.55rem; height: 1.55rem; border-radius: 50%; background: var(--bg-inset); color: var(--text-muted); font-size: 0.75rem; font-weight: 800; }
	.onboarding-steps li.complete > span { background: var(--success-bg); color: var(--success); }
	.onboarding-steps strong, .onboarding-steps small { display: block; }
	.onboarding-steps strong { font-size: 0.83rem; }
	.onboarding-steps small { margin-top: 0.3rem; color: var(--text-muted); font-size: 0.72rem; line-height: 1.4; }
	.onboarding-steps .btn { grid-column: 1 / -1; margin-top: 0.25rem; }
	@media (max-width: 900px) { .onboarding-steps { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
	@media (max-width: 560px) { .onboarding-heading { flex-direction: column; } .onboarding-steps { grid-template-columns: 1fr; } }

	.dashboard-header {
		border-bottom: 1px solid var(--border-color);
		padding-bottom: 1.5rem;
	}

	.limits-grid {
		margin-bottom: 0.5rem;
	}

	.limit-card {
		padding: 1.25rem;
	}

	.label-row {
		margin-bottom: 0.5rem;
		font-weight: 600;
		font-size: 0.9rem;
	}

	.progress-bar-bg {
		height: 8px;
		background-color: var(--bg-inset);
		border-radius: 9999px;
		overflow: hidden;
	}

	.progress-bar {
		height: 100%;
		background-color: var(--primary);
		border-radius: 9999px;
	}

	.workspace-layout {
		display: grid;
		grid-template-columns: 1fr 320px;
		gap: 2.5rem;
	}

	@media (max-width: 992px) {
		.workspace-layout {
			grid-template-columns: 1fr;
		}
	}

	.projects-section h2, .imports-sidebar h2 {
		margin-bottom: 1rem;
		font-size: 1.35rem;
	}

	.empty-state {
		text-align: center;
		padding: 3rem 1.5rem;
	}

	.empty-icon {
		font-size: 2.5rem;
		margin-bottom: 1rem;
		display: block;
	}

	.empty-state h3 {
		margin-bottom: 0.5rem;
	}

	.project-card {
		min-height: 160px;
		padding: 1.25rem;
		transition: var(--transition-base);
	}
	.project-card:hover {
		border-color: var(--primary-light);
		box-shadow: var(--shadow-md);
	}

	.card-header {
		margin-bottom: 0.5rem;
	}

	.project-name {
		margin-bottom: 0;
		font-size: 1.15rem;
	}
	.project-name a {
		color: var(--text-base);
	}
	.project-name a:hover {
		color: var(--primary);
		text-decoration: none;
	}

	.project-desc {
		font-size: 0.9rem;
		line-height: 1.4;
		margin-bottom: 1rem;
	}

	.project-footer {
		font-size: 0.8rem;
		border-top: 1px solid var(--border-color);
		padding-top: 0.75rem;
	}

	.imports-card {
		padding: 1rem;
	}

	.imports-list-links {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.import-item {
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--border-color);
	}
	.import-item:last-child {
		padding-bottom: 0;
		border-bottom: 0;
	}

	.import-file {
		font-weight: 600;
		font-size: 0.9rem;
		max-width: 180px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.import-meta {
		font-size: 0.75rem;
		display: flex;
		gap: 0.4rem;
		margin-top: 0.15rem;
	}

	.badge {
		font-size: 0.75rem;
		padding: 0.1rem 0.4rem;
		border-radius: var(--radius-sm);
		font-weight: 600;
	}

	.badge-visibility-public {
		background-color: var(--success-bg);
		color: var(--success);
	}
	.badge-visibility-unlisted {
		background-color: var(--accent-light);
		color: var(--accent);
	}
	.badge-visibility-private {
		background-color: var(--bg-inset);
		color: var(--text-muted);
	}

	.badge-status-completed {
		background-color: var(--success-bg);
		color: var(--success);
	}
	.badge-status-processing {
		background-color: var(--warning-bg);
		color: var(--warning);
	}
	.badge-status-failed, .badge-status-reverted {
		background-color: var(--error-bg);
		color: var(--error);
	}
</style>
