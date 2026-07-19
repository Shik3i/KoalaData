<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let loading = $state(false);
	let isOwnerOrAdmin = $derived(data.membershipRole === 'owner' || data.membershipRole === 'admin');

	function formatDate(timestamp: number) {
		return new Date(timestamp * 1000).toLocaleDateString();
	}
</script>

<div class="project-members-page">
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
		<!-- Left: Member Lists -->
		<div class="flex flex-col gap-2">
			<!-- Owner Section -->
			<section class="card settings-card">
				<h2>Project Owner</h2>
				<p class="text-muted">The primary owner has full management permissions, visibility controls, and deletion rights.</p>
				<hr class="divider" />
				<div class="owner-box flex align-center gap-2">
					<span class="owner-avatar"><Icon name="crown" /></span>
					<div>
						<strong>@{data.owner.username}</strong>
					</div>
				</div>
			</section>

			<!-- Editors List -->
			<section class="card settings-card">
				<h2>Editors ({data.editors.length})</h2>
				<p class="text-muted">Editors can view private metrics, modify descriptions, and upload CSV imports.</p>
				<hr class="divider" />
				{#if data.editors.length === 0}
					<p class="text-muted text-center py-2">No editors added yet.</p>
				{:else}
					<div class="editors-list">
						{#each data.editors as editor}
							<div class="editor-item flex justify-between align-center">
								<div>
									<strong>@{editor.username}</strong>
									<div class="text-muted">Joined {formatDate(editor.createdAt)}</div>
								</div>
								{#if isOwnerOrAdmin}
									<form action="?/removeEditor" method="POST" use:enhance>
										<input type="hidden" name="userId" value={editor.userId} />
										<button type="submit" class="btn btn-secondary btn-danger btn-sm">Remove</button>
									</form>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</section>
		</div>

		<!-- Right: Management Actions -->
		{#if isOwnerOrAdmin}
			<div class="flex flex-col gap-2">
				<!-- Add Editor Card -->
				<section class="card settings-card">
					<h2>Add Editor</h2>
					<p class="text-muted">Grant editor permissions to another registered developer.</p>
					<hr class="divider" />
					<form 
						action="?/addEditor" 
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
							<label for="username">User's Username</label>
							<input 
								type="text" 
								id="username" 
								name="username" 
								placeholder="Enter their exact username" 
								required 
								disabled={loading}
							/>
						</div>
						<button type="submit" class="btn btn-primary" disabled={loading}>
							{loading ? 'Adding...' : 'Add Editor'}
						</button>
					</form>
				</section>

				<!-- Transfer Ownership Card -->
				<section class="card settings-card danger-action-card">
					<h2>Transfer Ownership</h2>
					<p class="text-muted">Transfer ownership of this project. You will automatically be demoted to an editor.</p>
					<hr class="divider" />
					<form 
						action="?/transferOwnership" 
						method="POST" 
						use:enhance={() => {
							const ok = confirm('WARNING: Are you sure you want to transfer ownership of this project? This action is immediate.');
							if (!ok) return;
							loading = true;
							return async ({ update }) => {
								loading = false;
								update();
							};
						}}
					>
						<div class="form-group">
							<label for="newOwnerUsername">New Owner's Username</label>
							<input 
								type="text" 
								id="newOwnerUsername" 
								name="newOwnerUsername" 
								placeholder="Enter their exact username" 
								required 
								disabled={loading}
							/>
						</div>
						<button type="submit" class="btn btn-danger" disabled={loading}>
							{loading ? 'Transferring...' : 'Transfer Ownership'}
						</button>
					</form>
				</section>
			</div>
		{:else}
			<div class="card settings-card text-center text-muted">
				<p><Icon name="lock-key" /> You must be the Project Owner to add members or transfer ownership.</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.divider {
		border: 0;
		border-top: 1px solid var(--border-color);
		margin: 1rem 0;
	}

	.owner-box {
		padding: 1rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		background-color: var(--primary-bg);
	}

	.owner-avatar {
		font-size: 2rem;
	}

	.editors-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.editor-item {
		padding: 0.75rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		background-color: var(--bg-base);
	}

	.danger-action-card {
		border-color: hsl(0, 50%, 85%);
	}

	.btn-danger {
		background-color: var(--error);
		color: var(--text-inverse);
	}
	.btn-danger:hover {
		background-color: hsl(0, 50%, 35%);
	}
</style>
