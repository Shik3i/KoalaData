<script lang="ts">
	let { data } = $props();

	function formatDate(timestamp: number) {
		return new Date(timestamp * 1000).toLocaleDateString();
	}
</script>

<div class="users-list-page">
	<h1 class="page-title">User Management</h1>
	<p class="text-muted">Search, filter, and inspect user profiles and permissions.</p>

	<!-- Filters Card -->
	<div class="card filter-card">
		<form method="GET" class="filter-form flex align-center gap-2 flex-wrap">
			<div class="form-item search-item">
				<input 
					type="text" 
					name="q" 
					placeholder="Search username or display name..." 
					value={data.searchQuery}
				/>
			</div>

			<div class="form-item select-item">
				<select name="role" value={data.roleFilter}>
					<option value="">All Roles</option>
					<option value="user">User</option>
					<option value="admin">Admin</option>
				</select>
			</div>

			<div class="form-item select-item">
				<select name="status" value={data.statusFilter}>
					<option value="">All Statuses</option>
					<option value="pending">Pending</option>
					<option value="active">Active</option>
					<option value="rejected">Rejected</option>
					<option value="banned">Banned</option>
					<option value="deleted">Deleted</option>
				</select>
			</div>

			<div class="form-actions flex gap-1">
				<button type="submit" class="btn btn-primary">Search</button>
				<a href="/admin/users" class="btn btn-secondary">Clear</a>
			</div>
		</form>
	</div>

	<!-- Table Card -->
	<div class="card table-card">
		{#if data.users.length === 0}
			<div class="empty-state">
				<span class="empty-icon">👥</span>
				<h3>No Users Found</h3>
				<p>Try modifying your search query or filter options.</p>
			</div>
		{:else}
			<div class="table-wrapper">
				<table>
					<thead>
						<tr>
							<th>Username</th>
							<th>Display Name</th>
							<th>Role</th>
							<th>Status</th>
							<th>Joined Date</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each data.users as user}
							<tr>
								<td>
									<strong>{user.username}</strong>
								</td>
								<td>{user.displayName}</td>
								<td>
									<span class="badge {user.role === 'admin' ? 'badge-admin' : ''}">{user.role}</span>
								</td>
								<td>
									<span class="badge badge-status-{user.status}">{user.status}</span>
								</td>
								<td>{formatDate(user.createdAt)}</td>
								<td>
									<a href="/admin/users/{user.id}" class="btn btn-secondary btn-sm">Inspect</a>
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

	.filter-card {
		margin-top: 1.5rem;
		padding: 1rem;
	}

	.filter-form {
		width: 100%;
	}

	.form-item {
		margin-bottom: 0;
	}
	.form-item input, .form-item select {
		margin-bottom: 0;
	}

	.search-item {
		flex: 1;
		min-width: 250px;
	}

	.select-item {
		width: 150px;
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
	}

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
	}

	.empty-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
		display: block;
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
