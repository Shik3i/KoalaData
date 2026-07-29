<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { tick, untrack } from 'svelte';
	import { getImportGuidance } from '$lib/data-source-guidance';

	let { data, form } = $props();

	let loading = $state(false);
	let resultPanel: HTMLElement | undefined = $state();
	let isOwnerOrAdmin = $derived(data.membershipRole === 'owner' || data.membershipRole === 'admin');
	let isEditorOrAbove = $derived(isOwnerOrAdmin || data.membershipRole === 'editor');
	let uploadResult = $derived(page.url.searchParams.get('upload'));
	let importedCount = $derived(Number(page.url.searchParams.get('imported') ?? 0));
	let pendingCount = $derived(Number(page.url.searchParams.get('pending') ?? 0));
	let skippedCount = $derived(Number(page.url.searchParams.get('skipped') ?? 0));
	let hasUploadResult = $derived(uploadResult === 'complete' || uploadResult === 'partial' || uploadResult === 'duplicate');

	let selectedSourceId = $state(untrack(() => data.sources.length === 1 ? data.sources[0].id : ''));
	const selectedSource = $derived(data.sources.find((s) => s.id === selectedSourceId));
	const importGuidance = $derived(
		selectedSource
			? getImportGuidance(selectedSource.sourceType, selectedSource.externalUrl)
			: null
	);

	function formatDate(timestamp: number) {
		return new Date(timestamp * 1000).toLocaleString();
	}

	let fileInput: HTMLInputElement | undefined = $state();
	let isDragging = $state(false);
	let selectedFiles = $state<{ name: string; size: string }[]>([]);

	$effect(() => {
		if (hasUploadResult && resultPanel) {
			tick().then(() => resultPanel?.focus());
		}
	});

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

	function clearSelectedFiles() {
		selectedFiles = [];
		if (fileInput) fileInput.value = '';
	}

	function filesLabel(count: number) {
		return count === 1 ? 'file' : 'files';
	}
</script>

<div class="project-imports-page">
	{#if hasUploadResult}
		<section class="import-result import-result-{uploadResult}" bind:this={resultPanel} tabindex="-1" role="status" aria-live="polite" aria-labelledby="import-result-title">
			<div class="result-icon"><Icon name={uploadResult === 'partial' ? 'warning' : 'seal-check'} /></div>
			<div class="result-content">
				<p class="result-kicker">{uploadResult === 'duplicate' ? 'Nothing imported twice' : uploadResult === 'partial' ? 'Import partially completed' : 'Import complete'}</p>
				<h2 id="import-result-title">
					{#if uploadResult === 'duplicate'}
						{skippedCount} {filesLabel(skippedCount)} already imported
					{:else}
						{importedCount} {filesLabel(importedCount)} imported successfully
					{/if}
				</h2>
				<p>
					{#if uploadResult === 'duplicate'}
						KoalaData recognized the same file content and skipped it. Your existing data was not duplicated.
					{:else if pendingCount > 0}
						{pendingCount} {filesLabel(pendingCount)} still need column mapping below. Imported files are already visible in the dashboard.
					{:else}
						The selected files are cleared and the new data is ready in your dashboard.
					{/if}
					{#if skippedCount > 0 && uploadResult !== 'duplicate'}
						{skippedCount} already-imported {filesLabel(skippedCount)} were safely skipped.
					{/if}
				</p>
				<div class="result-actions">
					<a class="btn btn-primary" href="/p/{data.project.slug}"><Icon name="chart-line" /> View dashboard</a>
					<button class="btn btn-secondary" type="button" onclick={() => fileInput?.click()}><Icon name="plus" /> Import more files</button>
				</div>
			</div>
		</section>
	{:else if form?.success || page.url.searchParams.get('success')}
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
					<p class="text-muted">Known store exports import automatically. Unknown or custom CSV files open a mapping preview before anything is committed.</p>
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
							use:enhance={({ cancel }) => {
								if (loading) {
									cancel();
									return;
								}
								loading = true;
								return async ({ result, update }) => {
									try {
										if (result.type === 'redirect') clearSelectedFiles();
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

							{#if importGuidance}
								<div class="alert alert-info py-2" style="font-size: 0.8rem; margin-bottom: 1rem; border-color: var(--border-color);">
									<Icon name="arrow-square-out" /> <strong>{importGuidance.title}:</strong> {importGuidance.description}<br />
									<a href={importGuidance.url} target="_blank" rel="noopener noreferrer" style="font-weight: 600; text-decoration: underline; display: inline-block; margin-top: 0.25rem;">
										{importGuidance.linkLabel}
									</a>
									<p class="locale-dashboard-note">{importGuidance.note}</p>
								</div>
							{/if}

							{#if selectedSource?.sourceType === 'chrome_web_store'}
								<p class="locale-note"><code>?hl=en</code> requests the English CWS dashboard. Localized exports in English, German, French, Spanish, Portuguese, Italian, Dutch, Polish and Turkish remain supported.</p>
							{/if}

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
										<small>Multiple .csv files supported · duplicate files are skipped</small>
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
											<span class="preview-title"><Icon name="seal-check" /> Ready to import: {selectedFiles.length} {filesLabel(selectedFiles.length)}</span>
											<ul class="file-list-tags">
												{#each selectedFiles as item}
													<li><span class="file-name">{item.name}</span> <small class="file-size">{item.size}</small></li>
												{/each}
											</ul>
											<button class="clear-files" type="button" onclick={clearSelectedFiles} disabled={loading}>Clear selection</button>
										</div>
									{/if}
								</div>
							</div>

							<button type="submit" class="btn btn-primary btn-full" disabled={loading || selectedFiles.length === 0 || !selectedSourceId}>
								{loading
									? `Importing ${selectedFiles.length} ${filesLabel(selectedFiles.length)}…`
									: selectedFiles.length > 0
										? `Import ${selectedFiles.length} CSV ${filesLabel(selectedFiles.length)}`
										: 'Select CSV files to continue'}
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
										<td data-label="File">
											<strong class="filename" title={batch.originalFilename}>{batch.originalFilename}</strong>
											<div class="text-muted" style="font-size: 0.75rem;">
												Uploaded: {formatDate(batch.createdAt)}
											</div>
										</td>
										<td data-label="Date bounds">
											{#if batch.startDate && batch.endDate}
												<code>{batch.startDate}</code> to <code>{batch.endDate}</code>
											{:else}
												<span class="text-muted">—</span>
											{/if}
										</td>
										<td data-label="Diagnostics">
											<div class="diagnostic-grid text-muted">
												<span>Rows: <strong>{batch.rowCount}</strong></span>
												<span>Duplicates: <strong>{batch.duplicateCount}</strong></span>
												<span>Overlaps: <strong>{batch.overlapCount}</strong></span>
												{#if batch.warningCount > 0}
													<span class="text-warning">Warnings: {batch.warningCount}</span>
												{/if}
											</div>
										</td>
										<td data-label="Status">
											{#if batch.revertedAt}
												<span class="badge badge-reverted">Reverted</span>
											{:else}
												<span class="badge badge-status-{batch.status}">{batch.status}</span>
											{/if}
										</td>
										<td data-label="Action">
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
	.import-result {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 1rem;
		margin-bottom: 1.5rem;
		padding: 1.5rem;
		border: 2px solid var(--success);
		border-radius: var(--radius-lg);
		background: linear-gradient(135deg, var(--success-bg), var(--bg-surface));
		box-shadow: var(--shadow-md);
		outline: none;
	}
	.import-result-partial { border-color: var(--warning); background: linear-gradient(135deg, var(--warning-bg), var(--bg-surface)); }
	.result-icon {
		display: grid;
		place-items: center;
		width: 3rem;
		height: 3rem;
		border-radius: 50%;
		background: var(--success);
		color: var(--text-inverse);
		font-size: 1.6rem;
	}
	.import-result-partial .result-icon { background: var(--warning); }
	.result-kicker { margin: 0 0 0.15rem; color: var(--success); font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
	.import-result-partial .result-kicker { color: var(--warning); }
	.result-content h2 { margin: 0 0 0.35rem; font-size: 1.35rem; }
	.result-content > p:last-of-type { margin: 0; color: var(--text-muted); }
	.result-actions { display: flex; flex-wrap: wrap; gap: 0.65rem; margin-top: 1rem; }
	@media (max-width: 560px) {
		.import-result { grid-template-columns: 1fr; }
		.result-actions .btn { width: 100%; }
	}
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
	@media (max-width: 720px) {
		.table-wrapper { overflow: visible; padding: 0.75rem; }
		table, tbody, tr, td { display: block; width: 100%; }
		table { border: 0; }
		thead {
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
		tbody { display: grid; gap: 0.75rem; }
		tr {
			padding: 0.35rem 0.8rem;
			border: 1px solid var(--border-color);
			border-radius: var(--radius-md);
			background: var(--bg-surface);
			box-shadow: var(--shadow-sm);
		}
		td {
			display: grid;
			grid-template-columns: minmax(6.5rem, 0.38fr) minmax(0, 1fr);
			gap: 0.75rem;
			align-items: start;
			padding: 0.65rem 0;
			border-bottom: 1px solid var(--border-color);
			text-align: left;
		}
		td:last-child { border-bottom: 0; }
		td::before {
			content: attr(data-label);
			color: var(--text-muted);
			font-size: 0.72rem;
			font-weight: 700;
			letter-spacing: 0.04em;
			text-transform: uppercase;
		}
		td .filename { max-width: 100%; }
		td form, td .btn { justify-self: start; }
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
	.clear-files {
		margin-top: 0.65rem;
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--text-muted);
		font: inherit;
		font-weight: 600;
		text-decoration: underline;
		cursor: pointer;
	}
	.clear-files:hover { color: var(--text-base); }
	.clear-files:disabled { cursor: not-allowed; opacity: 0.6; }
</style>
