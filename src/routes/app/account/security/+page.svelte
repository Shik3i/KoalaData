<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let loading = $state(false);

	function formatDate(timestamp: number) {
		return new Date(timestamp * 1000).toLocaleString();
	}
</script>

<svelte:head>
	<title>Security Settings - KoalaData</title>
</svelte:head>

<div class="container security-page">
	<div class="account-grid">
		<!-- Sidebar Navigation -->
		<aside class="card sidebar-nav">
			<h3>Settings</h3>
			<ul class="nav-list">
				<li><a href="/app/account"><Icon name="user-circle" /> Profile Settings</a></li>
				<li><a href="/app/account/security" class="active" aria-current="page"><Icon name="lock-key" /> Security & Sessions</a></li>
			</ul>
		</aside>

		<!-- Main Settings Area -->
		<div class="settings-content">
			<!-- Password Form -->
			<section class="card settings-card form-section">
				<h2>Change Password</h2>
				<p class="text-muted">Change your account password. Changing your password will log out all other active sessions.</p>

				{#if form?.success && !form.success.includes('Session')}
					<div class="alert alert-success" role="status">
						{form.success}
					</div>
				{/if}

				{#if form?.error && !form.error.includes('Session')}
					<div class="alert alert-danger" role="alert">
						{form.error}
					</div>
				{/if}

				<form 
					action="?/changePassword" 
					method="POST" 
					use:enhance={() => {
						loading = true;
						return async ({ update }) => {
							try {
								await update();
							} finally {
								loading = false;
							}
						};
					}}
				>
					<div class="form-group">
						<label for="oldPassword">Current Password</label>
						<input 
							type="password" 
							id="oldPassword" 
							name="oldPassword" 
							autocomplete="current-password"
							required 
							disabled={loading}
						/>
					</div>

					<div class="form-group">
						<label for="newPassword">New Password</label>
						<input 
							type="password" 
							id="newPassword" 
							name="newPassword" 
							autocomplete="new-password"
							placeholder="Minimum 8 characters"
							required 
							disabled={loading}
						/>
					</div>

					<button type="submit" class="btn btn-primary" disabled={loading}>
						{loading ? 'Changing...' : 'Change Password'}
					</button>
				</form>
			</section>

			<!-- Active Sessions List -->
			<section class="card settings-card session-section">
				<div class="flex justify-between align-center session-header">
					<div>
						<h2>Active Sessions</h2>
						<p class="text-muted">These devices are currently logged in to your account.</p>
					</div>
					{#if data.sessions.length > 1}
						<form action="?/revokeAllSessions" method="POST" use:enhance>
							<button type="submit" class="btn btn-danger btn-sm">Revoke Other Sessions</button>
						</form>
					{/if}
				</div>

				{#if form?.success && form.success.includes('Session')}
					<div class="alert alert-success" role="status">
						{form.success}
					</div>
				{/if}

				<div class="session-list">
					{#each data.sessions as session}
						<div class="session-item flex justify-between align-center {session.isCurrent ? 'current-session' : ''}">
							<div class="session-details">
								<div class="flex align-center gap-1">
									<span class="session-icon"><Icon name={session.isCurrent ? 'device-mobile' : 'desktop'} /></span>
									<strong>{session.ipAddress || 'Unknown IP'}</strong>
									{#if session.isCurrent}
										<span class="current-badge">Current Session</span>
									{/if}
								</div>
								<div class="session-meta text-muted">
									<span>Last active: {formatDate(session.lastUsedAt)}</span>
									<span>•</span>
									<span class="ua-text" title={session.userAgent}>{session.userAgent || 'Unknown Device'}</span>
								</div>
							</div>
							<div class="session-action">
								<form action="?/revokeSession" method="POST" use:enhance>
									<input type="hidden" name="sessionHash" value={session.id} />
									<button 
										type="submit" 
										class="btn {session.isCurrent ? 'btn-secondary' : 'btn-danger'} btn-sm"
									>
										{session.isCurrent ? 'Log out' : 'Revoke'}
									</button>
								</form>
							</div>
						</div>
					{/each}
				</div>
			</section>
		</div>
	</div>
</div>

<style>
	.security-page {
		padding-block: 2rem;
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

	.settings-content {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.settings-card h2 {
		margin-bottom: 0.25rem;
	}

	.form-section {
		margin-bottom: 0;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	.session-header {
		margin-bottom: 1.5rem;
	}

	.session-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.session-item {
		padding: 1rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		background-color: var(--bg-inset);
	}

	.current-session {
		border-color: var(--primary-light);
		background-color: var(--primary-bg);
	}

	.session-details {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		max-width: 80%;
	}

	.session-meta {
		font-size: 0.8rem;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.ua-text {
		max-width: 300px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.current-badge {
		background-color: var(--primary);
		color: var(--text-inverse);
		font-size: 0.75rem;
		padding: 0.1rem 0.4rem;
		border-radius: var(--radius-sm);
		font-weight: 600;
	}

	@media (max-width: 640px) {
		.security-page { padding-block: 0.5rem 1.5rem; }
		.session-header, .session-item { flex-direction: column; align-items: stretch; gap: 1rem; }
		.session-details { max-width: 100%; }
		.session-action .btn, .session-header form, .session-header .btn { width: 100%; }
	}
</style>
