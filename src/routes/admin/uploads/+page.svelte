<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	let { data } = $props();

	function formatDate(timestamp: number) {
		return new Date(timestamp * 1000).toLocaleString();
	}

	function formatBytes(bytes: number) {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}
</script>

<div class="admin-uploads-page">
	<h1 class="page-title">Uploads & Imports</h1>
	<p class="text-muted">Monitor all database file uploads, row parsing results, and failure diagnoses.</p>

	<div class="card table-card" style="margin-top: 1.5rem;">
		{#if data.imports.length === 0}
			<div class="empty-state py-4 text-center">
				<span class="empty-icon"><Icon name="cloud-arrow-up" /></span>
				<h3>No Uploads Logged</h3>
				<p class="text-muted">No files have been imported into the system yet.</p>
			</div>
		{:else}
			<div class="table-wrapper">
				<table>
					<thead>
						<tr>
							<th>Project / User</th>
							<th>Filename</th>
							<th>Size</th>
							<th>Rows</th>
							<th>Status</th>
							<th>Time</th>
						</tr>
					</thead>
					<tbody>
						{#each data.imports as batch}
							<tr>
								<td>
									<strong><a href="/app/projects/{batch.projectId}">{batch.projectName}</a></strong>
									<div class="text-muted" style="font-size: 0.75rem;">Uploaded by: @{batch.username}</div>
								</td>
								<td>
									<span class="filename-tag" title={batch.originalFilename}>{batch.originalFilename}</span>
									{#if batch.errorMessage}
										<div class="text-danger" style="font-size: 0.75rem; max-width: 250px;" title={batch.errorMessage}>
											Error: {batch.errorMessage}
										</div>
									{/if}
								</td>
								<td>{formatBytes(batch.fileSize)}</td>
								<td>
									<div>{batch.rowCount} rows</div>
									{#if batch.warningCount > 0}
										<div class="text-warning" style="font-size: 0.75rem;">{batch.warningCount} warnings</div>
									{/if}
								</td>
								<td>
									{#if batch.revertedAt}
										<span class="badge badge-reverted">Reverted</span>
									{:else}
										<span class="badge badge-status-{batch.status}">{batch.status}</span>
									{/if}
								</td>
								<td>{formatDate(batch.createdAt)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>

<style>
	.page-title {
		margin-bottom: 0.25rem;
	}

	.table-card {
		padding: 0;
		overflow: hidden;
	}

	.table-wrapper {
		overflow-x: auto;
	}

	table {
		margin-bottom: 0;
	}

	th, td {
		padding: 0.75rem 1rem;
		vertical-align: middle;
	}

	.filename-tag {
		font-family: monospace;
		font-size: 0.85rem;
		word-break: break-all;
	}

	.empty-state {
		padding: 3rem;
	}
	.empty-icon {
		font-size: 2.5rem;
		margin-bottom: 0.5rem;
		display: block;
	}

	.badge {
		font-size: 0.75rem;
		padding: 0.15rem 0.45rem;
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
	.badge-status-failed {
		background-color: var(--error-bg);
		color: var(--error);
	}
	.badge-reverted {
		background-color: var(--bg-inset);
		color: var(--text-muted);
		border: 1px dashed var(--border-color);
	}
</style>
