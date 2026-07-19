<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { page } from '$app/state';

	let { children } = $props();
	let navOpen = $state(false);

	const isActive = (path: string, exact = false) => exact ? page.url.pathname === path : page.url.pathname.startsWith(path);
</script>

<svelte:head>
	<title>Admin Dashboard - KoalaData</title>
</svelte:head>

<div class="container admin-container">
	<div class="admin-grid">
		<!-- Admin Navigation Sidebar -->
		<aside class="card admin-sidebar">
			<div class="admin-sidebar-header">
				<h2>Admin Panel</h2>
				<button type="button" class="admin-nav-toggle" aria-controls="admin-navigation" aria-expanded={navOpen} onclick={() => navOpen = !navOpen}>
					<Icon name={navOpen ? 'caret-up' : 'caret-down'} /><span class="sr-only">Toggle admin navigation</span>
				</button>
			</div>
			<nav id="admin-navigation" class:open={navOpen} class="admin-navigation" aria-label="Admin navigation">
				<ul class="admin-nav-list">
					<li><a href="/admin" aria-current={isActive('/admin', true) ? 'page' : undefined} class={isActive('/admin', true) ? 'active' : ''}><Icon name="chart-line-up" /> System Overview</a></li>
					<li><a href="/admin/registrations" aria-current={isActive('/admin/registrations') ? 'page' : undefined} class={isActive('/admin/registrations') ? 'active' : ''}><Icon name="user-plus" /> Registrations Queue</a></li>
					<li><a href="/admin/users" aria-current={isActive('/admin/users') ? 'page' : undefined} class={isActive('/admin/users') ? 'active' : ''}><Icon name="users" /> User Management</a></li>
					<li><a href="/admin/projects" aria-current={isActive('/admin/projects') ? 'page' : undefined} class={isActive('/admin/projects') ? 'active' : ''}><Icon name="folder-open" /> Project Moderation</a></li>
					<li><a href="/admin/uploads" aria-current={isActive('/admin/uploads') ? 'page' : undefined} class={isActive('/admin/uploads') ? 'active' : ''}><Icon name="cloud-arrow-up" /> Uploads & Imports</a></li>
					<li><a href="/admin/leaderboards" aria-current={isActive('/admin/leaderboards') ? 'page' : undefined} class={isActive('/admin/leaderboards') ? 'active' : ''}><Icon name="trophy" /> Leaderboard Review</a></li>
					<li><a href="/admin/settings" aria-current={isActive('/admin/settings') ? 'page' : undefined} class={isActive('/admin/settings') ? 'active' : ''}><Icon name="gear" /> Global Settings</a></li>
					<li><a href="/admin/audit-log" aria-current={isActive('/admin/audit-log') ? 'page' : undefined} class={isActive('/admin/audit-log') ? 'active' : ''}><Icon name="clipboard-text" /> Security Audit Log</a></li>
				</ul>
			</nav>
		</aside>

		<!-- Admin Content Area -->
		<section class="admin-main" aria-label="Admin content">
			{@render children()}
		</section>
	</div>
</div>

<style>
	.admin-container {
		padding-block: 2rem;
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

	.admin-sidebar-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
	.admin-sidebar h2 {
		margin-bottom: 1.25rem;
		font-size: 1.1rem;
		border-bottom: 1px solid var(--border-color);
		padding-bottom: 0.5rem;
	}
	.admin-nav-toggle { display: none; width: 44px; height: 44px; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--bg-inset); color: var(--text-base); font-size: 1.5rem; cursor: pointer; }

	.admin-nav-list {
		list-style: none;
	}

	.admin-nav-list li {
		margin-bottom: 0.5rem;
	}

	.admin-nav-list a {
			display: flex;
			align-items: center;
			gap: 0.6rem;
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

	@media (max-width: 640px) {
		.admin-container { padding-block: 0.25rem 1.25rem; }
		.admin-grid { gap: 1rem; }
		.admin-sidebar h2 { margin: 0; border: 0; padding: 0; }
		.admin-nav-toggle { display: inline-grid; place-items: center; flex: 0 0 auto; }
		.admin-navigation { display: none; margin-top: 1rem; }
		.admin-navigation.open { display: block; }
		.admin-nav-list a { min-height: 44px; display: flex; align-items: center; }
	}
</style>
