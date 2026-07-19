<script lang="ts">
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
				<h1 class="project-title"><i class="ph ph-folder-open"></i> {project.name}</h1>
				<p class="text-muted">{project.shortDescription}</p>
			</div>
			<div class="project-badges flex gap-1">
				<span class="badge badge-visibility-{project.visibility}">{project.visibility}</span>
				{#if project.verificationStatus === 'verified'}
					<span class="badge badge-verified"><i class="ph ph-seal-check"></i> Verified</span>
				{/if}
				{#if project.leaderboardOptIn && project.leaderboardStatus === 'approved'}
					<span class="badge badge-leaderboard"><i class="ph ph-trophy"></i> Ranked</span>
				{/if}
			</div>
		</div>
	</div>

	<!-- Project Tabs -->
	<div class="project-tabs-card">
		<nav class="project-tabs">
			<a 
				href="/app/projects/{project.id}" 
				class="tab-link {page.url.pathname === `/app/projects/${project.id}` ? 'active' : ''}"
			>
				<i class="ph ph-chart-bar"></i> Overview
			</a>
			<a 
				href="/app/projects/{project.id}/sources" 
				class="tab-link {page.url.pathname.includes('/sources') ? 'active' : ''}"
			>
				<i class="ph ph-database"></i> Data Sources
			</a>
			<a 
				href="/app/projects/{project.id}/imports" 
				class="tab-link {page.url.pathname.includes('/imports') ? 'active' : ''}"
			>
				<i class="ph ph-clock"></i> Import History
			</a>
			<a 
				href="/app/projects/{project.id}/members" 
				class="tab-link {page.url.pathname.includes('/members') ? 'active' : ''}"
			>
				<i class="ph ph-users"></i> Members
			</a>
			<a 
				href="/app/projects/{project.id}/settings" 
				class="tab-link {page.url.pathname.includes('/settings') ? 'active' : ''}"
			>
				<i class="ph ph-gear"></i> Settings
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
