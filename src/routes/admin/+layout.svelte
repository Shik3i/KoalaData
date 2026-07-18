<script lang="ts">
	import { page } from '$app/state';

	let { children } = $props();
</script>

<svelte:head>
	<title>Admin Dashboard - KoalaData</title>
</svelte:head>

<div class="container admin-container">
	<div class="admin-grid">
		<!-- Admin Navigation Sidebar -->
		<aside class="card admin-sidebar">
			<h3>Admin Panel</h3>
			<ul class="admin-nav-list">
				<li><a href="/admin" class={page.url.pathname === '/admin' ? 'active' : ''}>📈 System Overview</a></li>
				<li><a href="/admin/registrations" class={page.url.pathname === '/admin/registrations' ? 'active' : ''}>🌱 Registrations Queue</a></li>
				<li><a href="/admin/users" class={page.url.pathname.startsWith('/admin/users') ? 'active' : ''}>👥 User Management</a></li>
				<li><a href="/admin/projects" class={page.url.pathname.startsWith('/admin/projects') ? 'active' : ''}>📁 Project Moderation</a></li>
				<li><a href="/admin/uploads" class={page.url.pathname.startsWith('/admin/uploads') ? 'active' : ''}>☁️ Uploads & Imports</a></li>
				<li><a href="/admin/leaderboards" class={page.url.pathname.startsWith('/admin/leaderboards') ? 'active' : ''}>🏆 Leaderboard Review</a></li>
				<li><a href="/admin/settings" class={page.url.pathname.startsWith('/admin/settings') ? 'active' : ''}>⚙️ Global Settings</a></li>
				<li><a href="/admin/audit-log" class={page.url.pathname.startsWith('/admin/audit-log') ? 'active' : ''}>📋 Security Audit Log</a></li>
			</ul>
		</aside>

		<!-- Admin Content Area -->
		<main class="admin-main">
			{@render children()}
		</main>
	</div>
</div>

<style>
	.admin-container {
		padding: 2rem 0;
	}

	.admin-grid {
		display: grid;
		grid-template-columns: 260px 1fr;
		gap: 2rem;
	}

	@media (max-width: 992px) {
		.admin-grid {
			grid-template-columns: 1fr;
		}
	}

	.admin-sidebar h3 {
		margin-bottom: 1.25rem;
		font-size: 1.1rem;
		border-bottom: 1px solid var(--border-color);
		padding-bottom: 0.5rem;
	}

	.admin-nav-list {
		list-style: none;
	}

	.admin-nav-list li {
		margin-bottom: 0.5rem;
	}

	.admin-nav-list a {
		display: block;
		padding: 0.6rem 0.8rem;
		border-radius: var(--radius-md);
		color: var(--text-base);
		font-weight: 500;
		font-size: 0.9rem;
	}

	.admin-nav-list a:hover, .admin-nav-list a.active {
		background-color: var(--primary-bg);
		color: var(--primary);
		text-decoration: none;
	}

	.admin-main {
		min-width: 0;
	}
</style>
