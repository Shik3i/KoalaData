<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/state';

	let { data, children } = $props();

	// Resolve the active user from data
	let user = $derived(data.user);

	// Theme handling state
	let currentTheme = $state('system');

	function applyTheme(theme: string) {
		localStorage.setItem('theme', theme);
		
		const root = document.documentElement;
		if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
			root.classList.add('dark');
		} else {
			root.classList.remove('dark');
		}
	}

	$effect(() => {
		applyTheme(currentTheme);
	});

	onMount(() => {
		// Read theme from localStorage
		const savedTheme = localStorage.getItem('theme') || 'system';
		currentTheme = savedTheme;

		// Listen for system theme changes if set to system
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const handleSystemThemeChange = () => {
			if (currentTheme === 'system') {
				applyTheme('system');
			}
		};

		mediaQuery.addEventListener('change', handleSystemThemeChange);
		return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
	});
</script>

<div class="layout-wrapper">
	<header class="main-header">
		<div class="container flex align-center justify-between">
			<a href="/" class="brand flex align-center gap-2">
				<span class="logo-icon">🌿</span>
				<span class="brand-name">KoalaData</span>
			</a>
			
			<nav class="nav-links flex align-center gap-3">
				<a href="/discover" class="nav-link {page.url.pathname === '/discover' ? 'active' : ''}">Discover</a>
				<a href="/leaderboards" class="nav-link {page.url.pathname === '/leaderboards' ? 'active' : ''}">Leaderboards</a>
				
				{#if user}
					<a href="/app" class="nav-link {page.url.pathname.startsWith('/app') ? 'active' : ''}">Dashboard</a>
					{#if user.role === 'admin'}
						<a href="/admin" class="nav-link admin-link {page.url.pathname.startsWith('/admin') ? 'active' : ''}">Admin</a>
					{/if}
				{/if}
			</nav>

			<div class="header-actions flex align-center gap-2">
				<!-- Theme Selector -->
				<div class="theme-selector">
					<select 
						bind:value={currentTheme} 
						aria-label="Theme mode"
					>
						<option value="light">☀️ Light</option>
						<option value="dark">🌙 Dark</option>
						<option value="system">💻 System</option>
					</select>
				</div>

				{#if user}
					<div class="user-menu flex align-center gap-2">
						<a href="/app/account" class="username-btn">👤 {user.displayName}</a>
						<form action="/login?/logout" method="POST" class="inline-form">
							<button type="submit" class="btn btn-secondary btn-sm">Log out</button>
						</form>
					</div>
				{:else}
					<a href="/login" class="btn btn-secondary btn-sm">Log in</a>
					<a href="/register" class="btn btn-primary btn-sm">Register</a>
				{/if}
			</div>
		</div>
	</header>

	{#if user && user.forcePasswordChange && page.url.pathname !== '/app/account/security'}
		<div class="container warning-banner">
			<div class="alert alert-warning flex justify-between align-center">
				<span>⚠️ For security reasons, you are required to change your password immediately.</span>
				<a href="/app/account/security" class="btn btn-primary btn-sm">Change Password</a>
			</div>
		</div>
	{/if}

	<main class="main-content">
		{@render children()}
	</main>

	<footer class="main-footer">
		<div class="container flex justify-between align-center text-muted">
			<p>© {new Date().getFullYear()} KoalaData. Nature-crafted extension metrics.</p>
			<div class="footer-links flex gap-2">
				<a href="/discover">Projects Index</a>
				<span>•</span>
				<a href="/leaderboards">Leaderboards</a>
			</div>
		</div>
	</footer>
</div>

<style>
	.layout-wrapper {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	.main-header {
		background-color: var(--bg-surface);
		border-bottom: 1px solid var(--border-color);
		padding: 1rem 0;
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.brand {
		font-weight: 800;
		font-size: 1.25rem;
		color: var(--primary);
	}
	.brand:hover {
		text-decoration: none;
	}
	.logo-icon {
		font-size: 1.5rem;
	}

	.nav-link {
		font-weight: 600;
		color: var(--text-muted);
		font-size: 0.95rem;
	}
	.nav-link:hover, .nav-link.active {
		color: var(--primary);
		text-decoration: none;
	}
	.admin-link {
		color: var(--accent);
	}
	.admin-link:hover, .admin-link.active {
		color: hsl(var(--accent-hue), 35%, 30%);
	}

	.theme-selector select {
		margin-bottom: 0;
		padding: 0.25rem 0.5rem;
		font-size: 0.85rem;
		border-radius: var(--radius-sm);
	}

	.username-btn {
		font-weight: 600;
		font-size: 0.9rem;
		color: var(--text-base);
	}
	.username-btn:hover {
		color: var(--primary);
		text-decoration: none;
	}

	.inline-form {
		display: inline;
	}

	.warning-banner {
		margin-top: 1rem;
	}

	.main-content {
		flex: 1;
		padding: 2rem 0;
	}

	.main-footer {
		background-color: var(--bg-inset);
		border-top: 1px solid var(--border-color);
		padding: 1.5rem 0;
		font-size: 0.85rem;
	}

	.footer-links a {
		color: var(--text-muted);
	}
	.footer-links a:hover {
		color: var(--primary);
	}
</style>
