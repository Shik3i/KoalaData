<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';

	let { data, form } = $props();

	let loading = $state(false);
	let isOwnerOrAdmin = $derived(data.membershipRole === 'owner' || data.membershipRole === 'admin');
	let isEditorOrAbove = $derived(isOwnerOrAdmin || data.membershipRole === 'editor');

	let selectedSourceId = $state('');
	const selectedSource = $derived(data.sources.find((s) => s.id === selectedSourceId));

	function getExtensionId(url: string | null | undefined): string | null {
		if (!url) return null;
		const match = url.match(/[a-p]{32}/i);
		return match ? match[0] : null;
	}

	const extensionId = $derived(selectedSource ? getExtensionId(selectedSource.externalUrl) : null);
	const devConsoleUrl = $derived(extensionId ? `https://chrome.google.com/webstore/devconsole/${extensionId}/analytics?hl=en` : null);

	function formatDate(timestamp: number) {
		return new Date(timestamp * 1000).toLocaleString();
	}
</script>

<div class="project-imports-page">
	{#if form?.success || page.url.searchParams.get('success')}
		<div class="alert alert-success" role="status">
			{form?.success || page.url.searchParams.get('success')}
		</div>
	{/if}

	{#if form?.error || page.url.searchParams.get('error')}
		<div class="alert alert-danger" role="alert">
			{form?.error || page.url.searchParams.get('error')}
		</div>
	{/if}

	<div class="grid grid-3">
		<!-- Left (Span 1): Upload CSV -->
		<div class="flex flex-col gap-2">
			{#if isEditorOrAbove}
				<section class="card settings-card">
					<h2>Upload CSV Data</h2>
					<p class="text-muted">Upload metrics data from Chrome Web Store dashboard exports or custom spreadsheets. You can select and upload multiple files at once.</p>
					<hr class="divider" />
					
					{#if data.sources.length === 0}
						<div class="alert alert-warning py-2 text-center" role="status" style="margin-bottom: 0;">
							<Icon name="warning" /> You must define a <strong>Data Source</strong> before you can upload data.
							<a href="/app/projects/{data.project.id}/sources" class="btn btn-secondary btn-sm mt-1" style="display: block;">Manage Sources</a>
						</div>
					{:else}
						<form 
							action="?/uploadCsv" 
							method="POST" 
							enctype="multipart/form-data"
							use:enhance={() => {
								loading = true;
								return async ({ update }) => {
									loading = false;
									update();
								};
							}}
						>
							<div class="form-group">
								<label for="sourceId">Target Data Source</label>
								<select id="sourceId" name="sourceId" bind:value={selectedSourceId} required disabled={loading}>
									<option value="" disabled selected>Select source...</option>
									{#each data.sources as src}
										<option value={src.id}>{src.name} ({src.sourceType})</option>
									{/each}
								</select>
							</div>

							{#if devConsoleUrl}
								<div class="alert alert-info py-2" style="font-size: 0.8rem; margin-bottom: 1rem; border-color: var(--border-color);">
									<Icon name="arrow-square-out" /> <strong>Chrome Web Store:</strong> Download CSVs in English here:<br />
									<a href={devConsoleUrl} target="_blank" rel="noopener noreferrer" style="font-weight: 600; text-decoration: underline; display: inline-block; margin-top: 0.25rem;">
										Open CWS Stats Dashboard (?hl=en)
									</a>
								</div>
							{/if}

							<div class="form-group">
								<label for="file">CSV Files</label>
								<input 
									type="file" 
									id="file" 
									name="file" 
									accept=".csv" 
									multiple
									required 
									disabled={loading}
								/>
							</div>

							<button type="submit" class="btn btn-primary btn-full" disabled={loading}>
								{loading ? 'Processing Files...' : 'Upload and Preview'}
							</button>
						</form>
					{/if}
				</section>

				{#if data.drafts.length > 0}
					<section class="card settings-card warning-card" style="margin-top: 1.5rem; border-color: var(--warning-border);">
						<h2>Pending Drafts ({data.drafts.length})</h2>
						<p class="text-muted" style="font-size: 0.85rem; margin-bottom: 1rem;">The following files require manual column mapping to complete the import.</p>
						<ul class="drafts-list" style="list-style: none; padding-left: 0; display: flex; flex-direction: column; gap: 0.75rem;">
							{#each data.drafts as draft}
								<li class="flex justify-between align-center" style="font-size: 0.85rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
									<div style="min-width: 0; flex: 1; margin-right: 0.5rem;">
										<div class="filename" style="font-weight: 600;" title={draft.originalFilename}>{draft.originalFilename}</div>
										<span class="text-muted" style="font-size: 0.75rem;">{draft.rowCount} rows</span>
									</div>
									<a href="/app/projects/{data.project.id}/imports/preview?draftId={draft.id}" class="btn btn-secondary btn-sm" style="flex-shrink: 0;">Map</a>
								</li>
							{/each}
						</ul>
					</section>
				{/if}
			{:else}
				<div class="card settings-card text-center text-muted">
					<p><Icon name="lock-key" /> You must be an Editor or Owner to upload CSV files.</p>
				</div>
			{/if}
		</div>

		<!-- Right (Span 2): Import History -->
		<div class="col-span-2 flex flex-col gap-2">
			<section class="card table-card">
				<div class="card-header" style="padding: 1.25rem 1.5rem 0.5rem 1.5rem;">
					<h2>Import History Logs</h2>
					<p class="text-muted">Audit log of all CSV uploads, parsing issues, overlapping counts, and rollbacks.</p>
				</div>
				<hr class="divider" style="margin: 0.5rem 0 0 0;" />
				
				{#if data.history.length === 0}
					<div class="empty-state py-4 text-center">
						<span class="empty-icon"><Icon name="clock-counter-clockwise" /></span>
						<h3>No Imports Yet</h3>
						<p class="text-muted">Import history will appear here once files are parsed and committed.</p>
					</div>
				{:else}
					<div class="table-wrapper">
						<table>
							<thead>
								<tr>
									<th>File Details</th>
									<th>Date Bounds</th>
									<th>Diagnostics</th>
									<th>Status</th>
									<th>Action</th>
								</tr>
							</thead>
							<tbody>
								{#each data.history as batch}
									<tr>
										<td>
											<strong class="filename" title={batch.originalFilename}>{batch.originalFilename}</strong>
											<div class="text-muted" style="font-size: 0.75rem;">
												Uploaded: {formatDate(batch.createdAt)}
											</div>
										</td>
										<td>
											{#if batch.startDate && batch.endDate}
												<code>{batch.startDate}</code> to <code>{batch.endDate}</code>
											{:else}
												<span class="text-muted">—</span>
											{/if}
										</td>
										<td>
											<div class="diagnostic-grid text-muted">
												<span>Rows: <strong>{batch.rowCount}</strong></span>
												<span>Duplicates: <strong>{batch.duplicateCount}</strong></span>
												<span>Overlaps: <strong>{batch.overlapCount}</strong></span>
												{#if batch.warningCount > 0}
													<span class="text-warning">Warnings: {batch.warningCount}</span>
												{/if}
											</div>
										</td>
										<td>
											{#if batch.revertedAt}
												<span class="badge badge-reverted">Reverted</span>
											{:else}
												<span class="badge badge-status-{batch.status}">{batch.status}</span>
											{/if}
										</td>
										<td>
											{#if batch.status === 'completed' && !batch.revertedAt}
												{#if isOwnerOrAdmin}
													<form 
														action="?/rollbackBatch" 
														method="POST" 
														use:enhance={() => {
													const ok = confirm('Revert this import? Its observations will be excluded from active metrics while the audit record is preserved.');
															if (!ok) return;
															return async ({ update }) => {
																update();
															};
														}}
													>
														<input type="hidden" name="batchId" value={batch.id} />
														<button type="submit" class="btn btn-secondary btn-danger btn-sm">Rollback</button>
													</form>
												{:else}
											<span class="text-muted" style="font-size: 0.8rem;"><Icon name="lock-key" /> Owner only</span>
												{/if}
											{:else}
												<span class="text-muted">—</span>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</section>
		</div>
	</div>
</div>

<style>
	.col-span-2 {
		grid-column: span 2;
	}

	@media (max-width: 992px) {
		.col-span-2 {
			grid-column: span 3;
		}
	}

	.divider {
		border: 0;
		border-top: 1px solid var(--border-color);
		margin: 1rem 0;
	}

	.btn-full {
		width: 100%;
		text-align: center;
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

	.filename {
		font-weight: 600;
		font-size: 0.9rem;
		display: block;
		max-width: 180px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.diagnostic-grid {
		font-size: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
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
	.badge-status-failed {
		background-color: var(--error-bg);
		color: var(--error);
	}
	.badge-reverted {
		background-color: var(--bg-inset);
		color: var(--text-muted);
		border: 1px dashed var(--border-color);
	}

	.empty-state {
		padding: 3rem;
	}
	.empty-icon {
		font-size: 2.5rem;
		margin-bottom: 0.5rem;
		display: block;
	}

	.btn-danger {
		background-color: var(--error);
		color: var(--text-inverse);
	}
	.btn-danger:hover {
		background-color: hsl(0, 50%, 35%);
	}
</style>
