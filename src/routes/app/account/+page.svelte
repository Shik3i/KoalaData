<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let loading = $state(false);
</script>

<svelte:head>
	<title>Account Settings - KoalaData</title>
</svelte:head>

<div class="container account-page">
	<div class="account-grid">
		<!-- Sidebar Navigation -->
		<aside class="card sidebar-nav">
			<h3>Settings</h3>
			<ul class="nav-list">
				<li><a href="/app/account" class="active">👤 Profile Settings</a></li>
				<li><a href="/app/account/security">🔒 Security & Sessions</a></li>
			</ul>
		</aside>

		<!-- Main Settings area -->
		<main class="card settings-card">
			<h2>Profile Settings</h2>
			<p class="text-muted">Manage your public and display metadata.</p>

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

			<form 
				action="?/updateProfile" 
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
					<label for="username">Username (Normalized)</label>
					<input 
						type="text" 
						id="username" 
						value={data.user.username} 
						disabled 
						readonly
					/>
					<small class="help-text">Usernames cannot be changed once created.</small>
				</div>

				<div class="form-group">
					<label for="displayName">Display Name</label>
					<input 
						type="text" 
						id="displayName" 
						name="displayName" 
						value={data.user.displayName} 
						required 
						disabled={loading}
					/>
				</div>

				<button type="submit" class="btn btn-primary" disabled={loading}>
					{loading ? 'Saving...' : 'Save Profile'}
				</button>
			</form>

			<hr class="divider" />

			<div class="meta-info">
				<h3>Account Meta</h3>
				<p><strong>Role:</strong> <span class="badge">{data.user.role}</span></p>
				<p><strong>Status:</strong> <span class="badge badge-success">{data.user.status}</span></p>
			</div>
		</main>
	</div>
</div>

<style>
	.account-page {
		padding: 2rem 0;
	}

	.account-grid {
		display: grid;
		grid-template-columns: 250px 1fr;
		gap: 2rem;
	}

	@media (max-width: 768px) {
		.account-grid {
			grid-template-columns: 1fr;
		}
	}

	.sidebar-nav h3 {
		margin-bottom: 1rem;
		font-size: 1.1rem;
	}

	.nav-list {
		list-style: none;
	}

	.nav-list li {
		margin-bottom: 0.5rem;
	}

	.nav-list a {
		display: block;
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius-md);
		color: var(--text-base);
		font-weight: 500;
	}

	.nav-list a:hover, .nav-list a.active {
		background-color: var(--primary-bg);
		color: var(--primary);
		text-decoration: none;
	}

	.settings-card h2 {
		margin-bottom: 0.25rem;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	.help-text {
		font-size: 0.8rem;
		color: var(--text-muted);
		display: block;
		margin-top: -0.75rem;
		margin-bottom: 1rem;
	}

	.divider {
		border: 0;
		border-top: 1px solid var(--border-color);
		margin: 2rem 0;
	}

	.meta-info h3 {
		font-size: 1.1rem;
		margin-bottom: 1rem;
	}

	.meta-info p {
		margin-bottom: 0.5rem;
		font-size: 0.9rem;
	}

	.badge {
		background-color: var(--bg-inset);
		padding: 0.15rem 0.4rem;
		border-radius: var(--radius-sm);
		font-weight: 600;
	}

	.badge-success {
		background-color: var(--success-bg);
		color: var(--success);
	}
</style>
