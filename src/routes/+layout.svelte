<script lang="ts">
	import '../app.css';
	import DesktopIcon from 'phosphor-svelte/lib/DesktopIcon';
	import ListIcon from 'phosphor-svelte/lib/ListIcon';
	import MoonIcon from 'phosphor-svelte/lib/MoonIcon';
	import SunIcon from 'phosphor-svelte/lib/SunIcon';
	import UserCircleIcon from 'phosphor-svelte/lib/UserCircleIcon';
	import WarningIcon from 'phosphor-svelte/lib/WarningIcon';
	import XIcon from 'phosphor-svelte/lib/XIcon';
	import { onMount } from 'svelte';
	import { page } from '$app/state';

	let { data, children } = $props();

	// Resolve the active user from data
	let user = $derived(data.user);

	// Theme handling state
	let currentTheme = $state('auto');
	let themeReady = $state(false);
	let mobileMenuOpen = $state(false);

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}

	function applyTheme(theme: string) {
		localStorage.setItem('theme', theme);
		
		const root = document.documentElement;
		if (theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
			root.classList.add('dark');
		} else {
			root.classList.remove('dark');
		}
	}

	$effect(() => {
		if (themeReady) applyTheme(currentTheme);
	});

	onMount(() => {
		// Read theme from localStorage
		const savedTheme = localStorage.getItem('theme') || 'auto';
		currentTheme = savedTheme === 'system' ? 'auto' : savedTheme;
		themeReady = true;

		// Listen for system theme changes if set to system
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const handleSystemThemeChange = () => {
			if (currentTheme === 'auto') {
				applyTheme('auto');
			}
		};

		mediaQuery.addEventListener('change', handleSystemThemeChange);
		return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
	});
</script>

<a class="skip-link" href="#main-content">Skip to main content</a>

<div class="layout-wrapper">
	<header class="main-header">
		<div class="container header-shell">
			<a href="/" class="brand flex align-center gap-2">
				<span class="logo-icon">
					<picture>
						<source
							type="image/avif"
							srcset="/brand/koaladata-icon-32.avif 1x, /brand/koaladata-icon-64.avif 2x"
						/>
						<source
							type="image/webp"
							srcset="/brand/koaladata-icon-32.webp 1x, /brand/koaladata-icon-64.webp 2x"
						/>
						<img src="/brand/koaladata-icon-32.png" width="32" height="32" alt="" aria-hidden="true" />
					</picture>
				</span>
				<span class="brand-name">{data.site.siteTitle}</span>
			</a>

			<button
				type="button"
				class="menu-toggle"
				aria-label="Toggle navigation"
				aria-controls="header-menu"
				aria-expanded={mobileMenuOpen}
				onclick={() => mobileMenuOpen = !mobileMenuOpen}
			>
				{#if mobileMenuOpen}<XIcon class="app-icon" aria-hidden="true" />{:else}<ListIcon class="app-icon" aria-hidden="true" />{/if}
			</button>

			<div id="header-menu" class:open={mobileMenuOpen} class="header-menu">
				<nav class="nav-links flex align-center gap-3" aria-label="Main navigation">
					{#if data.site.publicDiscoveryEnabled}
						<a href="/discover" onclick={closeMobileMenu} aria-current={page.url.pathname === '/discover' ? 'page' : undefined} class="nav-link {page.url.pathname === '/discover' ? 'active' : ''}">Discover</a>
					{/if}
					{#if data.site.publicLeaderboardsEnabled}
						<a href="/leaderboards" onclick={closeMobileMenu} aria-current={page.url.pathname === '/leaderboards' ? 'page' : undefined} class="nav-link {page.url.pathname === '/leaderboards' ? 'active' : ''}">Leaderboards</a>
					{/if}
					{#if user}
						<a href="/app" onclick={closeMobileMenu} aria-current={page.url.pathname.startsWith('/app') ? 'page' : undefined} class="nav-link {page.url.pathname.startsWith('/app') ? 'active' : ''}">Dashboard</a>
						{#if user.role === 'admin'}
							<a href="/admin" onclick={closeMobileMenu} aria-current={page.url.pathname.startsWith('/admin') ? 'page' : undefined} class="nav-link admin-link {page.url.pathname.startsWith('/admin') ? 'active' : ''}">Admin</a>
						{/if}
					{/if}
				</nav>

				<div class="header-actions flex align-center gap-2">
					<div class="theme-selector-group">
						<button 
							type="button"
							class="theme-toggle-btn {currentTheme === 'light' ? 'active' : ''}" 
							onclick={() => currentTheme = 'light'}
							aria-label="Light Mode"
							title="Light Mode"
						>
							<SunIcon class="app-icon" aria-hidden="true" />
						</button>
						<button 
							type="button"
							class="theme-toggle-btn {currentTheme === 'dark' ? 'active' : ''}" 
							onclick={() => currentTheme = 'dark'}
							aria-label="Dark Mode"
							title="Dark Mode"
						>
							<MoonIcon class="app-icon" aria-hidden="true" />
						</button>
						<button 
							type="button"
							class="theme-toggle-btn {currentTheme === 'auto' ? 'active' : ''}" 
							onclick={() => currentTheme = 'auto'}
							aria-label="System Theme"
							title="System Theme"
						>
							<DesktopIcon class="app-icon" aria-hidden="true" />
						</button>
					</div>

					{#if user}
						<div class="user-menu flex align-center gap-2">
							<a href="/app/account" onclick={closeMobileMenu} class="username-btn"><UserCircleIcon class="app-icon" aria-hidden="true" /> {user.username}</a>
							<form action="/login?/logout" method="POST" class="inline-form">
								<button type="submit" class="btn btn-secondary btn-sm">Log out</button>
							</form>
						</div>
					{:else}
						<a href="/login" onclick={closeMobileMenu} class="btn btn-secondary btn-sm">Log in</a>
						{#if data.site.registrationMode !== 'invite_only'}
							<a href="/register" onclick={closeMobileMenu} class="btn btn-primary btn-sm">Register</a>
						{/if}
					{/if}
				</div>
			</div>
		</div>
	</header>

	{#if user && user.forcePasswordChange && page.url.pathname !== '/app/account/security'}
		<div class="container warning-banner">
			<div class="alert alert-warning flex justify-between align-center flex-mobile-column" role="alert">
				<span><WarningIcon class="app-icon" aria-hidden="true" /> For security reasons, you are required to change your password immediately.</span>
				<a href="/app/account/security" class="btn btn-primary btn-sm">Change Password</a>
			</div>
		</div>
	{/if}

	<main id="main-content" class="main-content" tabindex="-1">
		{@render children()}
	</main>

	<footer class="main-footer">
		<div class="container footer-inner flex justify-between align-center text-muted">
			<p>© {new Date().getFullYear()} {data.site.siteTitle}. Nature-crafted extension metrics. v{data.version}</p>
			<div class="footer-links flex gap-2">
				{#if data.site.publicDiscoveryEnabled}<a href="/discover">Projects Index</a>{/if}
				{#if data.site.publicDiscoveryEnabled && data.site.publicLeaderboardsEnabled}<span>•</span>{/if}
				{#if data.site.publicLeaderboardsEnabled}<a href="/leaderboards">Leaderboards</a>{/if}
				<span>•</span>
				<a href="/imprint">Imprint</a>
				<span>•</span>
				<a href="/privacy">Privacy Policy</a>
				<span>•</span>
				<a href="https://github.com/Shik3i/KoalaData" target="_blank" rel="noopener noreferrer">GitHub</a>
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
		background-color: color-mix(in srgb, var(--bg-surface) 88%, transparent);
		backdrop-filter: blur(14px);
		border-bottom: 1px solid var(--border-color);
		padding: 0.75rem 0;
		position: sticky;
		top: 0;
		z-index: 100;
	}
	.header-shell { display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; }
	.header-menu { display: flex; align-items: center; justify-content: flex-end; gap: 1.5rem; min-width: 0; }
	.menu-toggle { display: none; width: 44px; height: 44px; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--bg-inset); color: var(--text-base); font-size: 1.35rem; cursor: pointer; }

	.brand {
		font-weight: 800;
		font-size: 1.25rem;
		color: var(--primary);
	}
	.brand:hover {
		text-decoration: none;
	}
	.logo-icon {
		display: inline-grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		flex: 0 0 2rem;
	}
	.logo-icon img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}
	.logo-icon picture {
		display: contents;
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

	.theme-selector-group {
		display: flex;
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 2px;
		gap: 2px;
	}

	.theme-toggle-btn {
		background: transparent;
		border: none;
		color: var(--text-muted);
		border-radius: calc(var(--radius-sm) - 2px);
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		padding: 0;
		transition: all 0.2s ease;
	}

	.theme-toggle-btn:hover {
		color: var(--text-base);
		background: rgba(0, 0, 0, 0.05);
	}

	:global(.dark) .theme-toggle-btn:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.theme-toggle-btn.active {
		color: var(--primary);
		background: var(--bg-app);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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

	.footer-links {
		flex-wrap: wrap;
	}
	.footer-links a {
		color: var(--text-muted);
	}
	.footer-links a:hover {
		color: var(--primary);
	}

	@media (max-width: 900px) {
		.header-shell { flex-wrap: wrap; }
		.menu-toggle { display: inline-grid; place-items: center; margin-left: auto; }
		.header-menu { display: none; width: 100%; align-items: stretch; padding-top: 0.75rem; border-top: 1px solid var(--border-color); }
		.header-menu.open { display: flex; flex-direction: column; }
		.nav-links, .header-actions, .user-menu { width: 100%; align-items: stretch; flex-direction: column; gap: 0.5rem; }
		.nav-link, .username-btn { display: flex; align-items: center; min-height: 44px; padding: 0.55rem 0.75rem; border-radius: var(--radius-md); }
		.nav-link.active { background: var(--primary-bg); }
		.theme-selector-group, .header-actions .btn, .inline-form, .inline-form .btn { width: 100%; }
	}

	@media (max-width: 640px) {
		.main-content { padding: 1.25rem 0; }
		.footer-inner { flex-direction: column; align-items: flex-start; gap: 0.75rem; }
		.footer-links span { display: none; }
		.footer-links { gap: 0.75rem 1rem; }
		.main-footer p { margin-bottom: 0; }
	}
</style>
