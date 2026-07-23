<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { untrack } from 'svelte';

	let { data, form } = $props();

	let loading = $state(false);
	let isOwnerOrAdmin = $derived(data.membershipRole === 'owner' || data.membershipRole === 'admin');
	let isEditorOrAbove = $derived(isOwnerOrAdmin || data.membershipRole === 'editor');

	let selectedSourceId = $state(untrack(() => data.sources.length === 1 ? data.sources[0].id : ''));
	const selectedSource = $derived(data.sources.find((s) => s.id === selectedSourceId));

	function getExtensionId(url: string | null | undefined): string | null {
		if (!url) return null;
		const match = url.match(/[a-p]{32}/i);
		return match ? match[0] : null;
	}

	const extensionId = $derived(selectedSource ? getExtensionId(selectedSource.externalUrl) : null);
	const devConsoleUrl = $derived(
		extensionId
			? `https://chrome.google.com/u/1/webstore/devconsole/e2f2b549-b9e3-48c2-b562-d5b16058d995/${extensionId}/analytics/installs?hl=en`
			: null
	);

	function formatDate(timestamp: number) {
		return new Date(timestamp * 1000).toLocaleString();
	}

	let fileInput: HTMLInputElement | undefined = $state();
	let isDragging = $state(false);
	let selectedFiles = $state<{ name: string; size: string }[]>([]);

	function formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		if (e.dataTransfer?.files && e.dataTransfer.files.length > 0 && fileInput) {
			const dataTransfer = new DataTransfer();
			const files = Array.from(e.dataTransfer.files).filter((f) => f.name.toLowerCase().endsWith('.csv'));
			if (files.length > 0) {
				files.forEach((f) => dataTransfer.items.add(f));
				fileInput.files = dataTransfer.files;
				selectedFiles = files.map((f) => ({ name: f.name, size: formatBytes(f.size) }));
			}
		}
	}

	function handleFileChange(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files) {
			selectedFiles = Array.from(target.files).map((f) => ({ name: f.name, size: formatBytes(f.size) }));
		}
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
					<p class="text-muted">Upload Chrome Web Store reports or custom CSV files. Every file is previewed before any data is committed.</p>
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
									try {
										await update();
									} finally {
										loading = false;
									}
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
									<Icon name="arrow-square-out" /> <strong>Chrome Web Store:</strong> Open the statistics dashboard and export the reports you want to publish.<br />
									<a href={devConsoleUrl} target="_blank" rel="noopener noreferrer" style="font-weight: 600; text-decoration: underline; display: inline-block; margin-top: 0.25rem;">
									Open CWS Stats Dashboard
								</a>
								<p class="locale-dashboard-note"><code>?hl=en</code> requests the English dashboard. This keeps CSV report names and headers consistent when your browser or Google account uses another language; localized exports are still supported.</p>
							</div>
							{/if}

							<p class="locale-note">Automatic detection: English, German, French, Spanish, Portuguese, Italian, Dutch, Polish and Turkish. Other files remain available for manual mapping.</p>

							<div class="form-group">
								<label for="file">CSV Files</label>
								<div 
									class="dropzone" 
									class:dragging={isDragging}
									ondragover={handleDragOver}
									ondragleave={handleDragLeave}
									ondrop={handleDrop}
									role="region"
									aria-label="CSV file drop zone"
								>
									<div class="dropzone-prompt">
										<Icon name="cloud-arrow-up" />
										<span><strong>Drag & drop CSV files here</strong> or <label for="file" class="dropzone-browse">browse files</label></span>
										<small>Supports multiple .csv files</small>
									</div>
									<input 
										bind:this={fileInput}
										type="file" 
										id="file" 
										name="file" 
										accept=".csv" 
										multiple
										required 
										disabled={loading}
										onchange={handleFileChange}
										class="visually-hidden-file-input"
									/>
									{#if selectedFiles.length > 0}
										<div class="selected-files-preview">
											<span class="preview-title"><Icon name="seal-check" /> {selectedFiles.length} file(s) selected:</span>
											<ul class="file-list-tags">
												{#each selectedFiles as item}
													<li><span class="file-name">{item.name}</span> <small class="file-size">({item.size})</small></li>
												{/each}
											</ul>
										</div>
									{/if}
								</div>
							</div>

							<button type="submit" class="btn btn-primary btn-full" disabled={loading}>
								{loading ? 'Processing Files...' : 'Upload and Preview'}
							</button>
						</form>
					{/if}
				</section>

				{#if data.drafts.length > 0}
					<section class="card settings-card warning-card" style="margin-top: 1.5rem; border-color: var(--warning-border);">
						<div class="flex justify-between align-center" style="margin-bottom: 0.5rem; gap: 0.5rem; flex-wrap: wrap;">
							<h2 style="margin: 0;">Pending Drafts ({data.drafts.length})</h2>
							<form method="POST" action="?/confirmAllDrafts" use:enhance>
								<button type="submit" class="btn btn-primary btn-sm" disabled={loading}>
									Import All Pending ({data.drafts.length})
								</button>
							</form>
						</div>
						<p class="text-muted" style="font-size: 0.85rem; margin-bottom: 1rem;">Review the detected date, metrics and aggregation rules before committing each file, or click "Import All Pending" to auto-import all detected files. Drafts expire after one hour.</p>
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
													use:enhance={({ cancel }) => {
														const ok = confirm('Revert this import? Its observations will be excluded from active metrics while the audit record is preserved.');
														if (!ok) {
															cancel();
															return;
														}
														return async ({ update }) => {
															await update();
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
						{#if data.historyPages > 1}
							<nav class="history-pagination" aria-label="Import history pages">
								{#if data.historyPage > 1}<a class="btn btn-secondary btn-sm" href="?historyPage={data.historyPage - 1}">Previous</a>{/if}
								<span>Page {data.historyPage} of {data.historyPages}</span>
								{#if data.historyPage < data.historyPages}<a class="btn btn-secondary btn-sm" href="?historyPage={data.historyPage + 1}">Next</a>{/if}
							</nav>
						{/if}
					{/if}
			</section>
		</div>
	</div>
</div>

	<style>
	.history-pagination { display: flex; align-items: center; justify-content: center; gap: 0.75rem; padding: 1rem; border-top: 1px solid var(--border-color); font-size: 0.8rem; }
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

	.locale-note {
		margin: -0.25rem 0 1rem;
		color: var(--text-muted);
		font-size: 0.78rem;
		line-height: 1.5;
	}

	.dropzone {
		border: 2px dashed var(--border-color);
		border-radius: var(--radius-md);
		padding: 1.5rem 1rem;
		text-align: center;
		background: var(--bg-surface);
		transition: border-color 0.2s, background-color 0.2s;
		position: relative;
	}
	.dropzone.dragging {
		border-color: var(--primary);
		background-color: var(--primary-bg, rgba(45, 102, 69, 0.08));
	}
	.dropzone-prompt {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
		color: var(--text-muted);
		font-size: 0.88rem;
	}
	.dropzone-browse {
		color: var(--primary);
		font-weight: 600;
		text-decoration: underline;
		cursor: pointer;
	}
	.dropzone small {
		font-size: 0.75rem;
		color: var(--text-muted);
	}
	.visually-hidden-file-input {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
	.selected-files-preview {
		margin-top: 1rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--border-color);
		text-align: left;
		font-size: 0.8rem;
	}
	.preview-title {
		font-weight: 600;
		color: var(--success);
		display: flex;
		align-items: center;
		gap: 0.35rem;
		margin-bottom: 0.35rem;
	}
	.file-list-tags {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		max-height: 120px;
		overflow-y: auto;
	}
	.file-list-tags li {
		background: var(--bg-inset);
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-sm);
		display: flex;
		justify-content: space-between;
		font-size: 0.78rem;
	}
	.file-name {
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.file-size {
		color: var(--text-muted);
		margin-left: 0.5rem;
	}
</style>
