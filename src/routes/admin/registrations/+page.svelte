<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	function formatDate(timestamp: number) {
		return new Date(timestamp * 1000).toLocaleString();
	}
</script>

<div class="registrations-page">
	<h1 class="page-title">Registrations Queue</h1>
	<p class="text-muted">Review, approve, or reject visitor registration requests.</p>

	{#if form?.success}
		<div class="alert alert-success">
			{form.success}
		</div>
	{/if}

	{#if form?.error}
		<div class="alert alert-danger">
			{form.error}
		</div>
	{/if}

	<div class="card table-card">
		{#if data.pendingUsers.length === 0}
			<div class="empty-state">
				<span class="empty-icon">🍃</span>
				<h3>Clean Queue!</h3>
				<p>There are no registration requests pending approval at the moment.</p>
			</div>
		{:else}
			<div class="table-wrapper">
				<table>
					<thead>
						<tr>
							<th>Username</th>
							<th>Display Name</th>
							<th>Requested Date</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each data.pendingUsers as user}
							<tr>
								<td>
									<strong>{user.username}</strong>
								</td>
								<td>{user.displayName}</td>
								<td>{formatDate(user.createdAt)}</td>
								<td>
									<div class="flex gap-1">
										<form action="?/approve" method="POST" use:enhance>
											<input type="hidden" name="userId" value={user.id} />
											<button type="submit" class="btn btn-primary btn-sm">Approve</button>
										</form>
										<form action="?/reject" method="POST" use:enhance>
											<input type="hidden" name="userId" value={user.id} />
											<button type="submit" class="btn btn-secondary btn-sm">Reject</button>
										</form>
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

	.empty-state h3 {
		margin-bottom: 0.5rem;
	}
</style>
