<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	let { data } = $props();

	function formatDate(timestamp: number) {
		return new Date(timestamp * 1000).toLocaleString();
	}
</script>

<div class="admin-audit-log-page">
	<h1 class="page-title">Security Audit Log</h1>
	<p class="text-muted">High-security audit trail logging administrative toggles, user status alterations, and data transactions.</p>

	<div class="card table-card" style="margin-top: 1.5rem;">
		{#if data.logs.length === 0}
			<div class="empty-state py-4 text-center">
				<span class="empty-icon"><Icon name="clipboard-text" /></span>
				<h3>Audit Log is empty</h3>
				<p class="text-muted">Security actions will be logged here as users interact with the system.</p>
			</div>
		{:else}
			<div class="table-wrapper">
				<table>
					<thead>
						<tr>
							<th>Timestamp</th>
							<th>Actor</th>
							<th>Action / Event</th>
							<th>Target</th>
							<th>IP Address</th>
							<th>Diagnostic Data</th>
						</tr>
					</thead>
					<tbody>
						{#each data.logs as log}
							<tr>
								<td>
									<span class="timestamp-col">{formatDate(log.createdAt)}</span>
								</td>
								<td>
									<strong>@{log.actorUsername}</strong>
									<div class="text-muted" style="font-size: 0.7rem;">ID: {log.userId || 'system'}</div>
								</td>
								<td>
									<span class="action-tag">{log.action}</span>
								</td>
								<td>
									<div class="target-col">
										<span class="badge badge-sm">{log.targetType}</span>
										<code class="target-id" title={log.targetId}>{log.targetId ? log.targetId.substring(0, 8) + '...' : '—'}</code>
									</div>
								</td>
								<td>
									<code>{log.ipAddress || 'Unknown'}</code>
								</td>
								<td>
									<pre class="payload-pre"><code>{log.payload}</code></pre>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
	{#if data.pagination.totalPages > 1}
		<nav class="pagination flex justify-between align-center" aria-label="Audit log pages">
			<a class="btn btn-secondary btn-sm" class:disabled={data.pagination.page <= 1} href="?page={data.pagination.page - 1}">Previous</a>
			<span class="text-muted">Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total} events</span>
			<a class="btn btn-secondary btn-sm" class:disabled={data.pagination.page >= data.pagination.totalPages} href="?page={data.pagination.page + 1}">Next</a>
		</nav>
	{/if}
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
		font-size: 0.85rem;
	}

	th, td {
		padding: 0.75rem 1rem;
		vertical-align: middle;
	}

	.timestamp-col {
		font-size: 0.8rem;
		color: var(--text-muted);
		white-space: nowrap;
	}

	.action-tag {
		font-weight: 700;
		color: var(--primary);
		font-family: monospace;
	}

	.target-col {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.target-id {
		font-size: 0.75rem;
	}

	.payload-pre {
		margin: 0;
		padding: 0.25rem;
		background-color: var(--bg-inset);
		border-radius: var(--radius-sm);
		max-width: 250px;
		max-height: 80px;
		overflow: auto;
		font-size: 0.75rem;
		border: 1px solid var(--border-color);
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
		font-size: 0.7rem;
		padding: 0.05rem 0.3rem;
		border-radius: var(--radius-sm);
		font-weight: 600;
		background-color: var(--primary-bg);
		color: var(--primary);
		width: fit-content;
	}
	.pagination { margin-top: 1rem; }
	.disabled { pointer-events: none; opacity: 0.45; }
</style>
