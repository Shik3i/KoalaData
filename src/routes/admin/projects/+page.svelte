<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let loading = $state(false);
</script>

<div class="admin-projects-page">
	<h1 class="page-title">Project Moderation</h1>
	<p class="text-muted">Monitor project dashboards, issue verified badges, or ban violating listings.</p>

	<!-- Search/Filters -->
	<div class="card filter-card" style="margin-top: 1.5rem; padding: 1rem;">
		<form method="GET" class="flex gap-1 align-center">
			<input 
				type="text" 
				name="q" 
				placeholder="Search projects by name..." 
				value={data.searchQuery}
				style="margin-bottom: 0; flex: 1;"
			/>
			<button type="submit" class="btn btn-primary">Search</button>
			<a href="/admin/projects" class="btn btn-secondary">Clear</a>
		</form>
	</div>

	{#if form?.success}
		<div class="alert alert-success mt-2">
			{form.success}
		</div>
	{/if}

	{#if form?.error}
		<div class="alert alert-danger mt-2">
			{form.error}
		</div>
	{/if}

	<div class="card table-card" style="margin-top: 1.5rem;">
		{#if data.projects.length === 0}
			<div class="empty-state py-4 text-center">
				<span class="empty-icon">📁</span>
				<h3>No Projects Found</h3>
				<p class="text-muted">No projects exist matching your search criteria.</p>
			</div>
		{:else}
			<div class="table-wrapper">
				<table>
					<thead>
						<tr>
							<th>Project Info</th>
							<th>Visibility</th>
							<th>Lifecycle</th>
							<th>Moderation</th>
							<th>Verification</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each data.projects as project}
							<tr>
								<td>
									<strong>{project.name}</strong>
									<div class="text-muted" style="font-size: 0.75rem;">
										Slug: <code>{project.slug}</code>
									</div>
								</td>
								<td>
									<span class="badge">{project.visibility}</span>
								</td>
								<td>
									<span class="badge {project.deletedAt ? 'badge-status-banned' : 'badge-status-active'}">
										{project.deletedAt ? 'deleted' : 'active'}
									</span>
								</td>
								<td>
									<span class="badge badge-status-{project.moderationStatus}">
										{project.moderationStatus}
									</span>
								</td>
								<td>
									<span class="badge badge-verified-{project.verificationStatus}">
										{project.verificationStatus}
									</span>
								</td>
								<td>
									<div class="flex gap-1 flex-wrap">
									{#if project.deletedAt}
										<form action="?/restore" method="POST" use:enhance>
											<input type="hidden" name="projectId" value={project.id} />
											<button type="submit" class="btn btn-primary btn-sm">Restore</button>
										</form>
									{:else}
									<!-- Moderation Form -->
										<form action="?/changeModeration" method="POST" use:enhance class="flex align-center gap-0.5">
											<input type="hidden" name="projectId" value={project.id} />
											<select name="moderationStatus" onchange={(e) => e.currentTarget.form?.requestSubmit()} style="margin-bottom: 0; padding: 0.25rem 0.5rem; font-size: 0.8rem; height: auto;">
												<option value="active" selected={project.moderationStatus === 'active'}>Active</option>
												<option value="hidden" selected={project.moderationStatus === 'hidden'}>Hidden</option>
												<option value="banned" selected={project.moderationStatus === 'banned'}>Banned</option>
											</select>
									</form>
										<!-- Verification Form -->
										<form action="?/changeVerification" method="POST" use:enhance class="flex align-center gap-0.5">
											<input type="hidden" name="projectId" value={project.id} />
											<select name="verificationStatus" onchange={(e) => e.currentTarget.form?.requestSubmit()} style="margin-bottom: 0; padding: 0.25rem 0.5rem; font-size: 0.8rem; height: auto;">
												<option value="unverified" selected={project.verificationStatus === 'unverified'}>Unverified</option>
												<option value="verified" selected={project.verificationStatus === 'verified'}>Verified</option>
											</select>
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

	.badge-status-active {
		background-color: var(--success-bg);
		color: var(--success);
	}
	.badge-status-hidden {
		background-color: var(--warning-bg);
		color: var(--warning);
	}
	.badge-status-banned {
		background-color: var(--error-bg);
		color: var(--error);
	}

	.badge-verified-verified {
		background-color: var(--primary-bg);
		color: var(--primary);
	}
	.badge-verified-unverified {
		background-color: var(--bg-inset);
		color: var(--text-muted);
	}
</style>
