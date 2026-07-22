<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import InfoTip from '$lib/components/InfoTip.svelte';
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let loading = $state(false);
	let isOwnerOrAdmin = $derived(data.membershipRole === 'owner' || data.membershipRole === 'admin');
</script>

<div class="project-settings-page">
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

	{#if !isOwnerOrAdmin}
		<div class="card settings-card text-center text-muted">
			<p><Icon name="lock-key" /> You must be the Project Owner to modify visibility, slugs, leaderboards, or delete this project.</p>
		</div>
	{/if}

	<div class="grid grid-2 settings-grid">
		<!-- Left: General & Slug Settings -->
		<div class="flex flex-col gap-2">
			<!-- General Settings Card -->
			<section class="card settings-card">
				<h2>General Metadata <InfoTip id="metadata-help" text="These details appear on the public dashboard after review. Only HTTPS links are accepted." /></h2>
				<hr class="divider" />
				<form 
					action="?/updateSettings" 
					method="POST" 
					use:enhance={() => {
						loading = true;
						return async ({ update }) => {
							try {
								await update({ reset: false, invalidateAll: true });
							} finally {
								loading = false;
							}
						};
					}}
				>
					<div class="form-group">
						<label for="name">Project Name</label>
						<input 
							type="text" 
							id="name" 
							name="name" 
							value={data.project.name} 
							required 
							disabled={loading}
						/>
					</div>

					<div class="form-group">
						<label for="category">Category</label>
						<select id="category" name="category" required disabled={loading}>
							<option value="productivity" selected={data.project.category === 'productivity'}>Productivity</option>
							<option value="entertainment" selected={data.project.category === 'entertainment'}>Entertainment</option>
							<option value="developer-tools" selected={data.project.category === 'developer-tools'}>Developer Tools</option>
							<option value="accessibility" selected={data.project.category === 'accessibility'}>Accessibility</option>
							<option value="privacy" selected={data.project.category === 'privacy'}>Privacy & Security</option>
							<option value="social" selected={data.project.category === 'social'}>Social</option>
							<option value="shopping" selected={data.project.category === 'shopping'}>Shopping</option>
							<option value="education" selected={data.project.category === 'education'}>Education</option>
							<option value="other" selected={data.project.category === 'other'}>Other</option>
						</select>
					</div>

					<fieldset class="classification-fieldset">
						<legend>Business model</legend>
						<div class="form-group">
							<label for="pricingModel">Pricing</label>
							<select id="pricingModel" name="pricingModel" required disabled={loading}>
								<option value="" disabled selected={data.project.pricingModel === 'unknown'}>Select pricing...</option>
								<option value="free" selected={data.project.pricingModel === 'free'}>Free</option>
								<option value="freemium" selected={data.project.pricingModel === 'freemium'}>Freemium</option>
								<option value="paid" selected={data.project.pricingModel === 'paid'}>Paid</option>
							</select>
						</div>
						<label class="checkbox-option" for="isOpenSource">
							<input id="isOpenSource" name="isOpenSource" type="checkbox" checked={Boolean(data.project.isOpenSource)} disabled={loading} />
							<span><strong>Open Source</strong><small>Requires a public repository URL.</small></span>
						</label>
					</fieldset>

					<div class="form-group">
						<label for="shortDescription">Short Description</label>
						<input 
							type="text" 
							id="shortDescription" 
							name="shortDescription" 
							value={data.project.shortDescription} 
							required 
							disabled={loading}
						/>
					</div>

					<div class="form-group">
						<label for="fullDescription">Full Description</label>
						<textarea 
							id="fullDescription" 
							name="fullDescription" 
							rows="4" 
							disabled={loading}
						>{data.project.fullDescription}</textarea>
					</div>

					<div class="form-group">
						<label for="websiteUrl">Website URL</label>
						<input 
							type="text" 
							id="websiteUrl" 
							name="websiteUrl" 
							value={data.project.websiteUrl || ''} 
							placeholder="https://..."
							disabled={loading}
						/>
					</div>

					<div class="form-group">
						<label for="repositoryUrl">Repository URL</label>
						<input 
							type="text" 
							id="repositoryUrl" 
							name="repositoryUrl" 
							value={data.project.repositoryUrl || ''} 
							placeholder="https://github.com/..."
							disabled={loading}
						/>
					</div>

					<div class="form-group">
						<label for="storeUrl">Web Store URL</label>
						<input 
							type="text" 
							id="storeUrl" 
							name="storeUrl" 
							value={data.project.storeUrl || ''} 
							placeholder="https://chromewebstore.google.com/..."
							disabled={loading}
						/>
						<small class="text-muted">Adding a valid Chrome Web Store URL automatically creates or updates the import source.</small>
					</div>

					<button type="submit" class="btn btn-primary" disabled={loading}>
						{loading ? 'Saving...' : 'Save Settings'}
					</button>
				</form>
			</section>
		</div>

		<!-- Right: Visibility, Slug, and Danger Zone -->
		<div class="flex flex-col gap-2">
			<!-- Logo Card -->
			<section class="card settings-card">
				<h2>Project Logo</h2>
				<p class="text-muted">Upload a project logo (PNG, JPEG, or WebP up to 2MB). SVG is blocked.</p>
				<hr class="divider" />
				
				<div class="logo-management flex align-center gap-2 flex-wrap" style="margin-bottom: 1.5rem;">
					{#if data.project.logoPath}
						<div class="logo-preview-box">
							<img 
								src="/api/projects/{data.project.id}/logo" 
								alt="{data.project.name} Logo" 
								class="project-logo-preview"
							/>
						</div>
						<form action="?/deleteLogo" method="POST" use:enhance>
							<button type="submit" class="btn btn-secondary btn-danger btn-sm">Delete Logo</button>
						</form>
					{:else}
						<div class="logo-preview-box empty-logo">
							<span>No Logo</span>
						</div>
					{/if}
				</div>

				{#if isOwnerOrAdmin}
					<form 
						action="?/uploadLogo" 
						method="POST" 
						enctype="multipart/form-data"
						use:enhance={() => {
							loading = true;
							return async ({ update }) => {
								loading = false;
								update();
							};
						}}
						class="logo-upload-form"
					>
						<div class="form-group" style="margin-bottom: 1rem;">
							<label for="logo">Select Image File</label>
							<input 
								type="file" 
								id="logo" 
								name="logo" 
								accept="image/png, image/jpeg, image/webp" 
								required
								disabled={loading}
							/>
						</div>
						<button type="submit" class="btn btn-primary btn-sm" disabled={loading}>
							{loading ? 'Uploading...' : 'Upload Logo'}
						</button>
					</form>
				{/if}
			</section>
			<!-- Visibility Settings Card -->
			{#if isOwnerOrAdmin}
				<section class="card settings-card">
					<h2>Project Visibility <InfoTip id="visibility-help" text="Public projects enter a short moderation review. Unlisted projects stay out of discovery. Private projects are members-only." /></h2>
					<p class="text-muted">Public listing requests are reviewed before anonymous visitors can access the dashboard.</p>
					<hr class="divider" />
					<form action="?/updateVisibility" method="POST" use:enhance>
						<div class="form-group">
							<label for="visibility">Visibility Mode</label>
							<select id="visibility" name="visibility" required>
								<option value="public" selected={data.project.visibility === 'public'}>Public (Listed in discover / search)</option>
								<option value="unlisted" selected={data.project.visibility === 'unlisted'}>Unlisted (Exempt from discover / search)</option>
								<option value="private" selected={data.project.visibility === 'private'}>Private (Members & Admins only)</option>
							</select>
						</div>
						<button type="submit" class="btn btn-primary">Save Visibility</button>
					</form>
				</section>

				<!-- URL Slug Settings Card -->
				<section class="card settings-card">
					<h2>Project Slug URL</h2>
					<p class="text-muted">Customize the public slug identifier for your project page.</p>
					<hr class="divider" />
					<form action="?/updateSlug" method="POST" use:enhance>
						<div class="form-group">
							<label for="slug">URL Slug</label>
							<input 
								type="text" 
								id="slug" 
								name="slug" 
								value={data.project.slug} 
								required
							/>
						</div>
						<div class="slug-preview text-muted">
							Preview: <code>/p/{data.project.slug}</code>
						</div>
						<button type="submit" class="btn btn-primary">Update Slug</button>
					</form>
				</section>

				<!-- Leaderboard opt-in -->
				<section class="card settings-card">
					<h2>Leaderboards Participation <InfoTip id="leaderboard-help" text="Leaderboard approval is separate from public listing review and can be revoked independently." /></h2>
					<p class="text-muted">Opt-in to participate in global rankings. Requires public visibility.</p>
					<hr class="divider" />
					<form action="?/updateLeaderboardOptIn" method="POST" use:enhance>
						<div class="form-group checkbox-group flex align-center gap-1">
							<input 
								type="checkbox" 
								id="leaderboardOptIn" 
								name="leaderboardOptIn" 
								value="true" 
								checked={data.project.leaderboardOptIn === 1}
							/>
							<label for="leaderboardOptIn">Opt-in to global leaderboards</label>
						</div>
						
						<div class="status-info text-muted">
							Leaderboard Status: <span class="badge badge-status">{data.project.leaderboardStatus}</span>
						</div>
						
						<button type="submit" class="btn btn-primary">Save Leaderboard Choice</button>
					</form>
				</section>

				<!-- Danger Zone Card -->
				<section class="card settings-card danger-zone-card">
					<h2>Danger Zone</h2>
					<p class="text-muted">Once soft deleted, you can request an administrator to restore this project if done by mistake.</p>
					<hr class="divider" />
					<form 
						action="?/deleteProject" 
						method="POST" 
						use:enhance={() => {
							const ok = confirm('WARNING: Are you sure you want to delete this project? This will hide the dashboard.');
							if (!ok) return;
							return async ({ update }) => {
								update();
							};
						}}
					>
						<button type="submit" class="btn btn-danger">Delete Project</button>
					</form>
				</section>
			{/if}
		</div>
	</div>
</div>

<style>
	.classification-fieldset { margin: 0 0 1rem; padding: 1rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); }
	.classification-fieldset legend { padding-inline: 0.35rem; font-weight: 700; }
	.checkbox-option { display: flex; align-items: center; gap: 0.65rem; padding: 0.65rem 0.8rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); cursor: pointer; }
	.checkbox-option input { width: 1.1rem; height: 1.1rem; margin: 0; }
	.checkbox-option span, .checkbox-option small { display: block; }
	.checkbox-option small { color: var(--text-muted); font-weight: 400; }
	.divider {
		border: 0;
		border-top: 1px solid var(--border-color);
		margin: 1rem 0;
	}

	.slug-preview {
		font-size: 0.85rem;
		margin-top: -0.75rem;
		margin-bottom: 1.25rem;
	}

	.status-info {
		font-size: 0.9rem;
		margin-bottom: 1.25rem;
		font-weight: 500;
	}

	.checkbox-group {
		margin-bottom: 1rem;
	}
	.checkbox-group label {
		margin-bottom: 0;
	}
	.checkbox-group input {
		margin-bottom: 0;
		width: auto;
	}

	.danger-zone-card {
		border-color: hsl(0, 50%, 85%);
	}

	.badge {
		font-size: 0.75rem;
		padding: 0.1rem 0.4rem;
		border-radius: var(--radius-sm);
		font-weight: 600;
		background-color: var(--bg-inset);
	}

	.btn-danger {
		background-color: var(--error);
		color: var(--text-inverse);
	}
	.btn-danger:hover {
		background-color: hsl(0, 50%, 35%);
	}

	.logo-preview-box {
		width: 80px;
		height: 80px;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: var(--bg-inset);
	}

	.project-logo-preview {
		max-width: 100%;
		max-height: 100%;
		object-fit: cover;
	}

	.empty-logo {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-muted);
	}

	.logo-upload-form input[type="file"] {
		margin-bottom: 0;
	}
</style>
