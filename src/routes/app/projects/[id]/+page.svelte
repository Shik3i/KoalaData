<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	let { data } = $props();

	let project = $derived(data.project);

	function formatDate(timestamp: number) {
		return new Date(timestamp * 1000).toLocaleDateString();
	}
</script>

<div class="project-overview-content">
	<div class="grid grid-2">
		<!-- Left: Project Info Card -->
		<div class="card info-card">
			<h2>Project Metadata</h2>
			<hr class="divider" />
			
			<div class="info-row">
				<strong>Category:</strong>
				<span><code>{project.category}</code></span>
			</div>
			
			<div class="info-row">
				<strong>Visibility:</strong>
				<span>{project.visibility}</span>
			</div>

			{#if project.websiteUrl}
				<div class="info-row">
					<strong>Website:</strong>
					<a href={project.websiteUrl} target="_blank" rel="noopener">{project.websiteUrl}</a>
				</div>
			{/if}

			{#if project.repositoryUrl}
				<div class="info-row">
					<strong>Repository:</strong>
					<a href={project.repositoryUrl} target="_blank" rel="noopener">{project.repositoryUrl}</a>
				</div>
			{/if}

			{#if project.storeUrl}
				<div class="info-row">
					<strong>Store URL:</strong>
					<a href={project.storeUrl} target="_blank" rel="noopener">{project.storeUrl}</a>
				</div>
			{/if}

			<div class="info-row description-row">
				<strong>Full Description:</strong>
				<p class="description-text">{project.fullDescription || 'No description provided.'}</p>
			</div>

			<hr class="divider" />
			
			<div class="flex justify-between align-center">
				<strong>Public Page Link:</strong>
				<a href="/p/{project.slug}" target="_blank" class="btn btn-secondary btn-sm"><Icon name="arrow-square-out" /> Visit Public Page</a>
			</div>
		</div>

		<!-- Right: Quick Stats & Sources -->
		<div class="flex flex-col gap-2">
			<!-- Sources Card -->
			<div class="card sources-card">
				<div class="flex justify-between align-center card-header">
					<h2>Data Sources</h2>
					<a href="/app/projects/{project.id}/sources" class="btn btn-secondary btn-sm">Manage</a>
				</div>
				<hr class="divider" />
				{#if data.sources.length === 0}
					<p class="text-muted text-center py-2">No data sources defined yet.</p>
					<a href="/app/projects/{project.id}/sources" class="btn btn-primary btn-sm btn-full"><Icon name="plus" /> Add Data Source</a>
				{:else}
					<ul class="sources-list-overview">
						{#each data.sources as src}
							<li class="src-item flex justify-between align-center">
								<div>
									<strong>{src.name}</strong>
									<span class="badge badge-sm">{src.sourceType}</span>
								</div>
								<span class="text-muted">{src.granularity}</span>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<!-- Recent Imports Card -->
			<div class="card imports-card">
				<div class="flex justify-between align-center card-header">
					<h2>Recent Imports</h2>
					<a href="/app/projects/{project.id}/imports" class="btn btn-secondary btn-sm">Upload CSV</a>
				</div>
				<hr class="divider" />
				{#if data.importsList.length === 0}
					<p class="text-muted text-center py-2">No imports uploaded yet.</p>
				{:else}
					<ul class="imports-list-overview">
						{#each data.importsList as batch}
							<li class="import-item flex justify-between align-center">
								<div>
									<div class="filename" title={batch.originalFilename}>{batch.originalFilename}</div>
									<div class="meta text-muted">{batch.rowCount} rows • {formatDate(batch.createdAt)}</div>
								</div>
								<span class="badge badge-status-{batch.status}">{batch.status}</span>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.divider {
		border: 0;
		border-top: 1px solid var(--border-color);
		margin: 1rem 0;
	}

	.info-card {
		padding: 1.5rem;
	}

	.info-row {
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.75rem;
		font-size: 0.95rem;
		border-bottom: 1px dashed var(--border-color);
		padding-bottom: 0.5rem;
	}
	.info-row:last-of-type {
		border-bottom: 0;
	}

	.description-row {
		flex-direction: column;
		align-items: flex-start;
		gap: 0.25rem;
	}

	.description-text {
		font-size: 0.9rem;
		color: var(--text-muted);
		white-space: pre-wrap;
		margin-top: 0.5rem;
	}

	.btn-full {
		width: 100%;
		text-align: center;
	}

	.card-header {
		margin-bottom: 0.5rem;
	}

	.sources-list-overview, .imports-list-overview {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.src-item, .import-item {
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--border-color);
	}
	.src-item:last-child, .import-item:last-child {
		padding-bottom: 0;
		border-bottom: 0;
	}

	.filename {
		font-weight: 600;
		font-size: 0.9rem;
		max-width: 180px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.import-item .meta {
		font-size: 0.75rem;
		margin-top: 0.15rem;
	}

	.badge {
		font-size: 0.75rem;
		padding: 0.1rem 0.4rem;
		border-radius: var(--radius-sm);
		font-weight: 600;
		background-color: var(--bg-inset);
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
