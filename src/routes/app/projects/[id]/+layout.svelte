<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { page } from '$app/state';

	let { data, children } = $props();

	let project = $derived(data.project);
	let role = $derived(data.membershipRole);
</script>

<div class="container project-layout">
	<!-- Breadcrumb / Header -->
	<div class="project-header">
		<div class="breadcrumbs text-muted">
			<a href="/app">Workspace</a>
			<span>/</span>
			<a href="/app">Projects</a>
			<span>/</span>
			<span class="current">{project.name}</span>
		</div>
		
		<div class="title-row flex justify-between align-center flex-wrap gap-2">
			<div>
				<h1 class="project-title"><Icon name="folder-open" /> {project.name}</h1>
				<p class="text-muted">{project.shortDescription}</p>
			</div>
			<div class="project-badges flex gap-1">
				<span class="badge badge-visibility-{project.visibility}">{project.visibility}</span>
				{#if project.verificationStatus === 'verified'}
					<span class="badge badge-verified"><Icon name="seal-check" /> Verified</span>
				{/if}
				{#if project.leaderboardOptIn && project.leaderboardStatus === 'approved'}
					<span class="badge badge-leaderboard"><Icon name="trophy" /> Ranked</span>
				{/if}
			</div>
		</div>
	</div>

	{#if project.moderationStatus === 'hidden'}
		<div class="alert alert-info review-notice" role="status">
			<Icon name="clock-counter-clockwise" />
			<div><strong>Directory listing pending review.</strong> {project.moderationReason || 'The dashboard is visible only to project members and administrators.'}</div>
			<a class="btn btn-secondary btn-sm" href="/p/{project.slug}">Preview dashboard</a>
		</div>
	{/if}

	<!-- Project Tabs -->
	<div class="project-tabs-card">
		<nav class="project-tabs" aria-label="Project navigation">
			<a 
				href="/app/projects/{project.id}" 
				aria-current={page.url.pathname === `/app/projects/${project.id}` ? 'page' : undefined}
				class="tab-link {page.url.pathname === `/app/projects/${project.id}` ? 'active' : ''}"
			>
				<Icon name="chart-line" /> Overview
			</a>
			<a 
				href="/app/projects/{project.id}/sources" 
				aria-current={page.url.pathname.includes('/sources') ? 'page' : undefined}
				class="tab-link {page.url.pathname.includes('/sources') ? 'active' : ''}"
			>
				<Icon name="database" /> Data Sources
			</a>
			<a 
				href="/app/projects/{project.id}/imports" 
				aria-current={page.url.pathname.includes('/imports') ? 'page' : undefined}
				class="tab-link {page.url.pathname.includes('/imports') ? 'active' : ''}"
			>
				<Icon name="clock-counter-clockwise" /> Import History
			</a>
			<a 
				href="/app/projects/{project.id}/members" 
				aria-current={page.url.pathname.includes('/members') ? 'page' : undefined}
				class="tab-link {page.url.pathname.includes('/members') ? 'active' : ''}"
			>
				<Icon name="users" /> Members
			</a>
			<a 
				href="/app/projects/{project.id}/settings" 
				aria-current={page.url.pathname.includes('/settings') ? 'page' : undefined}
				class="tab-link {page.url.pathname.includes('/settings') ? 'active' : ''}"
			>
				<Icon name="gear" /> Settings
			</a>
		</nav>
	</div>

	<!-- Main child views -->
	<div class="project-view-content">
		{@render children()}
	</div>
</div>

<style>
	.project-layout {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.project-header {
		border-bottom: 1px solid var(--border-color);
		padding-bottom: 1rem;
	}
	.review-notice { display: flex; align-items: center; gap: 0.75rem; margin: -0.5rem 0 0; }
	.review-notice div { flex: 1; }
	@media (max-width: 640px) { .review-notice { align-items: flex-start; flex-wrap: wrap; } .review-notice .btn { width: 100%; } }

	.breadcrumbs {
		font-size: 0.85rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}
	.breadcrumbs a {
		color: var(--text-muted);
	}
	.breadcrumbs a:hover {
		color: var(--primary);
	}
	.breadcrumbs .current {
		color: var(--text-base);
		font-weight: 600;
	}

	.project-title {
		font-size: 1.75rem;
		margin-bottom: 0.25rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.badge {
		font-size: 0.75rem;
		padding: 0.15rem 0.5rem;
		border-radius: var(--radius-sm);
		font-weight: 700;
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}
	.badge-visibility-public { background-color: var(--success-bg); color: var(--success); }
	.badge-visibility-unlisted { background-color: var(--accent-light); color: var(--accent); }
	.badge-visibility-private { background-color: var(--bg-inset); color: var(--text-muted); }
	.badge-verified { background-color: var(--primary-bg); color: var(--primary); }
	.badge-leaderboard { background-color: #fdf5ea; color: #b37424; border: 1px solid #f2e2cf; }

	.project-tabs-card {
		border-bottom: 1px solid var(--border-color);
	}

	.project-tabs {
		display: flex;
		gap: 1.5rem;
		overflow-x: auto;
		margin-bottom: -1px;
	}

	.tab-link {
		padding: 0.75rem 0.5rem;
		color: var(--text-muted);
		font-weight: 600;
		font-size: 0.95rem;
		border-bottom: 2px solid transparent;
		white-space: nowrap;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}
	.tab-link:hover {
		color: var(--primary);
		text-decoration: none;
	}
	.tab-link.active {
		color: var(--primary);
		border-bottom-color: var(--primary);
	}

	.project-view-content {
		min-height: 300px;
	}
</style>
