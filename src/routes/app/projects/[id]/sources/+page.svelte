<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let loading = $state(false);
	let isOwnerOrAdmin = $derived(data.membershipRole === 'owner' || data.membershipRole === 'admin');
	let isEditorOrAbove = $derived(isOwnerOrAdmin || data.membershipRole === 'editor');
</script>

<div class="data-sources-page">
	{#if form?.success}
		<div class="alert alert-success" role="status">
			{form.success}
		</div>
	{/if}

	{#if form?.error}
		<div class="alert alert-danger" role="alert">
			{form.error}
		</div>
	{/if}

	<div class="grid grid-2">
		<!-- Left: Sources List -->
		<div class="flex flex-col gap-2">
			<section class="card settings-card">
				<h2>Defined Data Sources ({data.sources.length})</h2>
				<p class="text-muted">A source defines the origin format of CSV files (e.g. Chrome Web Store vs Generic CSV format).</p>
				<hr class="divider" />

				{#if data.sources.length === 0}
					<div class="empty-state py-4 text-center">
						<span class="empty-icon"><Icon name="database" /></span>
						<h3>No Data Sources</h3>
						<p class="text-muted">Define a source to start importing metrics data.</p>
					</div>
				{:else}
					<div class="sources-list flex flex-col gap-1">
						{#each data.sources as src}
							<div class="src-item card flex justify-between align-center">
								<div>
									<strong>{src.name}</strong>
									<div class="src-meta text-muted">
										<span class="badge badge-sm">{src.sourceType}</span>
										<span>•</span>
										<span>{src.granularity} reporting interval</span>
									</div>
									{#if src.externalUrl}
										<div class="src-url text-muted">
											Link: <a href={src.externalUrl} target="_blank" rel="noopener">{src.externalUrl}</a>
										</div>
									{/if}
								</div>
								{#if isOwnerOrAdmin}
									<form 
										action="?/deleteSource" 
										method="POST" 
										use:enhance={() => {
											const ok = confirm('Delete this unused data source? Sources with imports or metrics are protected from deletion.');
											if (!ok) return;
											return async ({ update }) => {
												update();
											};
										}}
									>
										<input type="hidden" name="sourceId" value={src.id} />
										<button type="submit" class="btn btn-secondary btn-danger btn-sm">Delete</button>
									</form>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</section>
		</div>

		<!-- Right: Add Source -->
		<div class="flex flex-col gap-2">
			{#if isEditorOrAbove}
				<section class="card settings-card">
					<h2>Add Data Source</h2>
					<p class="text-muted">Add a data source to categorize incoming CSV charts.</p>
					<hr class="divider" />
					<form 
						action="?/addSource" 
						method="POST" 
						use:enhance={() => {
							loading = true;
							return async ({ update }) => {
								loading = false;
								update();
							};
						}}
					>
						<div class="form-group">
							<label for="name">Source Name</label>
							<input 
								type="text" 
								id="name" 
								name="name" 
								placeholder="e.g. Chrome Web Store Export" 
								required 
								disabled={loading}
							/>
						</div>

						<div class="form-group">
							<label for="sourceType">Source Type</label>
							<select id="sourceType" name="sourceType" required disabled={loading}>
								<option value="chrome_web_store" selected>Chrome Web Store Export</option>
								<option value="generic_csv">Generic / Custom CSV</option>
							</select>
						</div>

						<div class="form-group">
							<label for="granularity">Reporting Granularity</label>
							<select id="granularity" name="granularity" required disabled={loading}>
								<option value="daily" selected>Daily</option>
								<option value="weekly">Weekly</option>
								<option value="monthly">Monthly</option>
								<option value="irregular">Irregular / Event-driven</option>
							</select>
						</div>

						<div class="form-group">
							<label for="externalUrl">External Store Link (Optional)</label>
							<input 
								type="text" 
								id="externalUrl" 
								name="externalUrl" 
								placeholder="https://chromewebstore.google.com/..."
								disabled={loading}
							/>
						</div>

						<button type="submit" class="btn btn-primary" disabled={loading}>
							{loading ? 'Adding...' : 'Add Data Source'}
						</button>
					</form>
				</section>
			{:else}
				<div class="card settings-card text-center text-muted">
					<p><Icon name="lock-key" /> You must be an Editor or Owner to add new data sources.</p>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.divider {
		border: 0;
		border-top: 1px solid var(--border-color);
		margin: 1rem 0;
	}

	.empty-state {
		padding: 2rem;
	}
	.empty-icon {
		font-size: 2.5rem;
		margin-bottom: 0.5rem;
		display: block;
	}

	.sources-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.src-item {
		padding: 1rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		background-color: var(--bg-inset);
	}

	.src-meta {
		font-size: 0.8rem;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-top: 0.15rem;
	}

	.src-url {
		font-size: 0.75rem;
		margin-top: 0.4rem;
	}

	.badge {
		font-size: 0.7rem;
		padding: 0.1rem 0.35rem;
		border-radius: var(--radius-sm);
		font-weight: 600;
		background-color: var(--primary-bg);
		color: var(--primary);
	}

	.btn-danger {
		background-color: var(--error);
		color: var(--text-inverse);
	}
	.btn-danger:hover {
		background-color: hsl(0, 50%, 35%);
	}
</style>
