<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { enhance } from '$app/forms';

	let { data, form } = $props();
</script>

<div class="admin-leaderboards-page">
	<h1 class="page-title">Leaderboard Review</h1>
	<p class="text-muted">Review, approve, or reject projects requesting participation in the global growth leaderboard.</p>

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

	<div class="card table-card">
		{#if data.projects.length === 0}
			<div class="empty-state py-4 text-center">
				<span class="empty-icon"><Icon name="trophy" /></span>
				<h3>No requests</h3>
				<p class="text-muted">No projects have requested leaderboard participation yet.</p>
			</div>
		{:else}
			<div class="table-wrapper">
				<table>
					<thead>
						<tr>
							<th>Project Name</th>
							<th>Slug</th>
							<th>Visibility</th>
							<th>Review Status</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each data.projects as project}
							<tr>
								<td>
									<strong>{project.name}</strong>
								</td>
								<td><code>{project.slug}</code></td>
								<td><span class="badge">{project.visibility}</span></td>
								<td>
									<span class="badge badge-status-{project.leaderboardStatus}">
										{project.leaderboardStatus}
									</span>
								</td>
								<td>
									<div class="flex gap-1">
										{#if project.leaderboardStatus !== 'approved'}
											<form action="?/approve" method="POST" use:enhance>
												<input type="hidden" name="projectId" value={project.id} />
												<button type="submit" class="btn btn-primary btn-sm">Approve</button>
											</form>
										{/if}
										{#if project.leaderboardStatus !== 'rejected'}
											<form action="?/reject" method="POST" use:enhance>
												<input type="hidden" name="projectId" value={project.id} />
												<button type="submit" class="btn btn-secondary btn-sm">Reject</button>
											</form>
										{/if}
									</div>
								</td>
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
		margin-top: 1.5rem;
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
		padding: 1rem;
		vertical-align: middle;
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
		padding: 0.1rem 0.4rem;
		border-radius: var(--radius-sm);
		font-weight: 600;
		background-color: var(--bg-inset);
	}

	.badge-status-approved {
		background-color: var(--success-bg);
		color: var(--success);
	}
	.badge-status-pending {
		background-color: var(--warning-bg);
		color: var(--warning);
	}
	.badge-status-rejected {
		background-color: var(--error-bg);
		color: var(--error);
	}
</style>
