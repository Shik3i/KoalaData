<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import InfoTip from '$lib/components/InfoTip.svelte';
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let loading = $state(false);
</script>

<svelte:head>
	<title>Create Project - KoalaData</title>
</svelte:head>

<div class="container project-new-page">
	<div class="card form-card">
		<a href="/app" class="back-link">← Cancel and Back</a>
		<h1 class="form-title">Create New Project</h1>
		<p class="text-muted">Create a private workspace first. Public directory listings are reviewed before they become visible.</p>
		
		{#if data.limitReached}
			<div class="alert alert-danger" role="alert">
				<Icon name="warning" /> <strong>Limit Reached:</strong> You have reached your limit of <strong>{data.maxProjects}</strong> projects. Please delete an existing project or contact an administrator to override your limits.
			</div>
		{/if}

		{#if form?.error}
			<div class="alert alert-danger" role="alert">
				{form.error}
			</div>
		{/if}

		<ol class="form-steps" aria-label="Project setup steps">
			<li><span>1</span><strong>Store listing</strong></li>
			<li><span>2</span><strong>Project details</strong></li>
			<li><span>3</span><strong>Visibility</strong></li>
		</ol>

		<form 
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
				<label for="name">Project Name</label>
				<input 
					type="text" 
					id="name" 
					name="name" 
					placeholder="e.g. Privacy Toolkit"
					required 
					disabled={loading || data.limitReached}
				/>
			</div>

			<div class="grid grid-2">
				<div class="form-group">
					<label for="category">Category</label>
					<select id="category" name="category" required disabled={loading || data.limitReached}>
						<option value="" disabled selected>Select category...</option>
						<option value="productivity">Productivity</option>
						<option value="entertainment">Entertainment</option>
						<option value="developer-tools">Developer Tools</option>
						<option value="accessibility">Accessibility</option>
						<option value="privacy">Privacy & Security</option>
						<option value="social">Social</option>
						<option value="shopping">Shopping</option>
						<option value="education">Education</option>
						<option value="other">Other</option>
					</select>
				</div>

				<div class="form-group">
					<label for="visibility">Visibility <InfoTip id="visibility-help" text="Unlisted is safest while preparing: project members can review the dashboard, but it is not shown in Discover. Public listings require administrator review." /></label>
					<select id="visibility" name="visibility" required disabled={loading || data.limitReached}>
						<option value="unlisted" selected>Unlisted (Recommended while preparing)</option>
						<option value="public">Public (Submitted for directory review)</option>
						<option value="private">Private (Only visible to you and editors)</option>
					</select>
				</div>
			</div>

			<fieldset class="classification-fieldset">
				<legend>Business model</legend>
				<p class="text-muted field-help">Shown as compact badges in Discover, leaderboards, and the public dashboard.</p>
				<div class="grid grid-2">
					<div class="form-group">
						<label for="pricingModel">Pricing</label>
						<select id="pricingModel" name="pricingModel" required disabled={loading || data.limitReached}>
							<option value="" disabled selected>Select pricing...</option>
							<option value="free">Free</option>
							<option value="freemium">Freemium</option>
							<option value="paid">Paid</option>
						</select>
					</div>
					<label class="checkbox-option" for="isOpenSource">
						<input id="isOpenSource" name="isOpenSource" type="checkbox" disabled={loading || data.limitReached} />
						<span><strong>Open Source</strong><small>Requires a public repository URL.</small></span>
					</label>
				</div>
			</fieldset>

			<div class="form-group">
				<label for="shortDescription">Short Description</label>
				<input 
					type="text" 
					id="shortDescription" 
					name="shortDescription" 
					placeholder="Brief sentence describing the project (max 200 characters)" 
					required 
					disabled={loading || data.limitReached}
				/>
			</div>

			<div class="form-group">
				<label for="fullDescription">Full Description</label>
				<textarea 
					id="fullDescription" 
					name="fullDescription" 
					placeholder="Describe the extension features, metrics, and details..." 
					rows="6"
					disabled={loading || data.limitReached}
				></textarea>
			</div>

			<div class="form-group">
				<label for="websiteUrl">Website URL (Optional)</label>
				<input 
					type="text" 
					id="websiteUrl" 
					name="websiteUrl" 
					placeholder="https://example.com" 
					disabled={loading || data.limitReached}
				/>
			</div>

			<div class="grid grid-2">
				<div class="form-group">
					<label for="repositoryUrl">Repository URL (Optional)</label>
					<input 
						type="text" 
						id="repositoryUrl" 
						name="repositoryUrl" 
						placeholder="https://github.com/..." 
						disabled={loading || data.limitReached}
					/>
					<small>Approved public listings use standard dofollow links. Search engines decide independently how links affect rankings.</small>
				</div>

				<div class="form-group">
					<label for="storeUrl">Chrome Web Store URL <InfoTip id="store-url-help" text="A valid Chrome Web Store item URL lets KoalaData create the standard import source and open the correct statistics dashboard for you." /></label>
					<input 
						type="text" 
						id="storeUrl" 
						name="storeUrl" 
						placeholder="https://chromewebstore.google.com/..." 
						disabled={loading || data.limitReached}
					/>
					<small>Recommended. Must be an HTTPS item URL on chromewebstore.google.com.</small>
				</div>
			</div>

			<button type="submit" class="btn btn-primary btn-full" disabled={loading || data.limitReached}>
				{loading ? 'Creating Project...' : 'Create Project'}
			</button>
		</form>
	</div>
</div>

<style>
	.classification-fieldset { margin: 0 0 1rem; padding: 1rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); }
	.classification-fieldset legend { padding-inline: 0.35rem; font-weight: 700; }
	.field-help { margin: -0.25rem 0 0.75rem; font-size: 0.85rem; }
	.checkbox-option { display: flex; align-items: center; gap: 0.65rem; min-height: 2.75rem; margin-top: 1.55rem; padding: 0.65rem 0.8rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); cursor: pointer; }
	.checkbox-option input { width: 1.1rem; height: 1.1rem; margin: 0; }
	.checkbox-option span, .checkbox-option small { display: block; }
	.checkbox-option small { color: var(--text-muted); font-weight: 400; }
	.project-new-page {
		display: flex;
		justify-content: center;
		padding: 2rem 1.5rem;
	}

	.form-card {
		width: 100%;
		max-width: 700px;
	}
	.form-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; margin: 1.5rem 0; padding: 0; list-style: none; }
	.form-steps li { display: flex; align-items: center; gap: 0.5rem; padding: 0.65rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); color: var(--text-muted); font-size: 0.78rem; }
	.form-steps span { display: grid; place-items: center; width: 1.35rem; height: 1.35rem; border-radius: 50%; background: var(--primary-bg); color: var(--primary); font-weight: 800; }
	.form-group small { display: block; margin-top: 0.35rem; color: var(--text-muted); font-size: 0.72rem; }
	@media (max-width: 560px) { .form-steps { grid-template-columns: 1fr; } }

	.back-link {
		font-weight: 600;
		font-size: 0.9rem;
		display: inline-block;
		margin-bottom: 1rem;
	}

	.form-title {
		margin-bottom: 0.25rem;
	}

	.form-group {
		margin-bottom: 1.25rem;
	}

	.btn-full {
		width: 100%;
		margin-top: 1rem;
	}
</style>
