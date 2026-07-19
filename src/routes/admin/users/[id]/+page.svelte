<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let loading = $state(false);

	function formatDate(timestamp: number) {
		return new Date(timestamp * 1000).toLocaleString();
	}

	function formatBytes(bytes: number | null) {
		if (bytes === null) return 'Default';
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}
</script>

<svelte:head>
	<title>Manage User - {data.targetUser.username}</title>
</svelte:head>

<div class="user-detail-page">
	<div class="flex justify-between align-center page-header">
		<div>
			<a href="/admin/users" class="back-link">← Back to User List</a>
			<h1 class="user-title"><Icon name="user-circle" /> {data.targetUser.username}</h1>
		</div>
		<div class="user-status-badges flex gap-1">
			<span class="badge {data.targetUser.role === 'admin' ? 'badge-admin' : ''}">{data.targetUser.role}</span>
			<span class="badge badge-status-{data.targetUser.status}">{data.targetUser.status}</span>
		</div>
	</div>

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

	<div class="grid grid-2 detail-layout">
		<!-- Left Column: Actions & Details -->
		<div class="flex flex-col gap-2">
			<!-- Moderation Actions Card -->
			<section class="card settings-card">
				<h2>Account Actions</h2>
				<hr class="divider" />
				<div class="actions-grid flex flex-wrap gap-1">
					{#if data.targetUser.status === 'pending'}
						<form action="?/approve" method="POST" use:enhance>
							<button type="submit" class="btn btn-primary">Approve Account</button>
						</form>
						<form action="?/reject" method="POST" use:enhance>
							<button type="submit" class="btn btn-secondary">Reject Account</button>
						</form>
					{/if}

					{#if data.targetUser.status === 'active'}
						<form action="?/ban" method="POST" use:enhance>
							<button type="submit" class="btn btn-danger">Ban User</button>
						</form>
						<form action="?/delete" method="POST" use:enhance>
							<button type="submit" class="btn btn-danger">Delete (Soft)</button>
						</form>
						{#if data.targetUser.role === 'user'}
							<form action="?/promote" method="POST" use:enhance>
								<button type="submit" class="btn btn-secondary">Promote to Admin</button>
							</form>
						{/if}
						{#if data.targetUser.role === 'admin'}
							<form action="?/demote" method="POST" use:enhance>
								<button type="submit" class="btn btn-secondary">Demote to User</button>
							</form>
						{/if}
					{/if}

					{#if data.targetUser.status === 'banned'}
						<form action="?/unban" method="POST" use:enhance>
							<button type="submit" class="btn btn-primary">Unban User</button>
						</form>
					{/if}

					{#if data.targetUser.status === 'deleted'}
						<form action="?/restore" method="POST" use:enhance>
							<button type="submit" class="btn btn-primary">Restore Account</button>
						</form>
					{/if}
				</div>
			</section>

			<!-- Reset Password Card -->
			<section class="card settings-card">
				<h2>Reset Password</h2>
				<hr class="divider" />
				<form action="?/resetPassword" method="POST" use:enhance>
					<div class="form-group">
						<label for="newPassword">New Password</label>
						<input 
							type="password" 
							id="newPassword" 
							name="newPassword" 
							placeholder="Minimum 8 characters"
							required
						/>
					</div>
					<div class="form-group checkbox-group flex align-center gap-1">
						<input 
							type="checkbox" 
							id="forceChange" 
							name="forceChange" 
							value="true" 
							checked
						/>
						<label for="forceChange">Force password change on next login</label>
					</div>
					<button type="submit" class="btn btn-secondary">Reset Password</button>
				</form>
			</section>
		</div>

		<!-- Right Column: Limits & Sessions -->
		<div class="flex flex-col gap-2">
			<!-- Limit Overrides Card -->
			<section class="card settings-card">
				<h2>Limit Overrides</h2>
				<p class="text-muted">Override default limits for this specific user. Leave blank to inherit system defaults.</p>
				<hr class="divider" />
				<form action="?/saveLimits" method="POST" use:enhance>
					<div class="form-group">
						<label for="maxProjects">Max Projects</label>
						<input 
							type="number" 
							id="maxProjects" 
							name="maxProjects" 
							value={data.limits?.maxProjects ?? ''} 
							placeholder="System Default"
						/>
					</div>

					<div class="form-group">
						<label for="maxStorageBytes">Max Storage (Bytes)</label>
						<input 
							type="number" 
							id="maxStorageBytes" 
							name="maxStorageBytes" 
							value={data.limits?.maxStorageBytes ?? ''} 
							placeholder="System Default (e.g. 26214400)"
						/>
					</div>

					<div class="form-group">
						<label for="maxCsvSizeBytes">Max CSV Size (Bytes)</label>
						<input 
							type="number" 
							id="maxCsvSizeBytes" 
							name="maxCsvSizeBytes" 
							value={data.limits?.maxCsvSizeBytes ?? ''} 
							placeholder="System Default (e.g. 10485760)"
						/>
					</div>

					<div class="form-group">
						<label for="maxCsvRows">Max CSV Rows</label>
						<input 
							type="number" 
							id="maxCsvRows" 
							name="maxCsvRows" 
							value={data.limits?.maxCsvRows ?? ''} 
							placeholder="System Default (e.g. 100000)"
						/>
					</div>

					<button type="submit" class="btn btn-primary">Save Overrides</button>
				</form>
			</section>
		</div>
	</div>

	<!-- Projects List Section -->
	<section class="card detail-section table-section">
		<h2>Projects Owned ({data.projects.length})</h2>
		<hr class="divider" />
		{#if data.projects.length === 0}
			<p class="text-muted">This user does not own any active projects.</p>
		{:else}
			<div class="table-wrapper">
				<table>
					<thead>
						<tr>
							<th>Project Name</th>
							<th>Slug</th>
							<th>Visibility</th>
							<th>Moderation</th>
							<th>Created Date</th>
						</tr>
					</thead>
					<tbody>
						{#each data.projects as project}
							<tr>
								<td><strong>{project.name}</strong></td>
								<td><code>{project.slug}</code></td>
								<td><span class="badge">{project.visibility}</span></td>
								<td><span class="badge badge-status-{project.moderationStatus}">{project.moderationStatus}</span></td>
								<td>{formatDate(project.createdAt)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

	<!-- Session List Section -->
	<section class="card detail-section table-section">
		<h2>Active Sessions ({data.sessions.length})</h2>
		<hr class="divider" />
		{#if data.sessions.length === 0}
			<p class="text-muted">No active sessions for this user.</p>
		{:else}
			<div class="table-wrapper">
				<table>
					<thead>
						<tr>
							<th>IP Address</th>
							<th>Last Used</th>
							<th>Device / User Agent</th>
							<th>Action</th>
						</tr>
					</thead>
					<tbody>
						{#each data.sessions as session}
							<tr>
								<td><strong>{session.ipAddress || 'Unknown IP'}</strong></td>
								<td>{formatDate(session.lastUsedAt)}</td>
								<td class="ua-cell" title={session.userAgent}>{session.userAgent || 'Unknown'}</td>
								<td>
									<form action="?/revokeSession" method="POST" use:enhance>
										<input type="hidden" name="sessionHash" value={session.id} />
										<button type="submit" class="btn btn-danger btn-sm">Revoke</button>
									</form>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</div>

<style>
	.back-link {
		font-weight: 600;
		font-size: 0.9rem;
		display: inline-block;
		margin-bottom: 0.5rem;
	}

	.user-detail-page {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.page-header {
		border-bottom: 1px solid var(--border-color);
		padding-bottom: 1rem;
	}

	.divider {
		border: 0;
		border-top: 1px solid var(--border-color);
		margin: 1rem 0;
	}

	.checkbox-group {
		margin-bottom: 1rem;
	}
	.checkbox-group label {
		margin-bottom: 0;
	}
	.checkbox-group input {
		margin-bottom: 0;
	}

	.table-section {
		padding: 1.5rem;
	}

	.table-wrapper {
		overflow-x: auto;
	}

	table {
		margin-bottom: 0;
	}

	.ua-cell {
		max-width: 250px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.badge-admin {
		background-color: var(--warning-bg);
		color: var(--warning);
	}

	.badge-status-active {
		background-color: var(--success-bg);
		color: var(--success);
	}
	.badge-status-pending {
		background-color: var(--warning-bg);
		color: var(--warning);
	}
	.badge-status-banned, .badge-status-rejected, .badge-status-deleted {
		background-color: var(--error-bg);
		color: var(--error);
	}
</style>
