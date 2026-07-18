<script lang="ts">
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
		<p class="text-muted">Register a new browser extension project in your workspace.</p>
		
		{#if data.limitReached}
			<div class="alert alert-danger">
				⚠️ <strong>Limit Reached:</strong> You have reached your limit of <strong>{data.maxProjects}</strong> projects. Please delete an existing project or contact an administrator to override your limits.
			</div>
		{/if}

		{#if form?.error}
			<div class="alert alert-danger">
				{form.error}
			</div>
		{/if}

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
					placeholder="e.g. KoalaSync" 
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
					<label for="visibility">Visibility</label>
					<select id="visibility" name="visibility" required disabled={loading || data.limitReached}>
						<option value="public" selected>🌍 Public (Visible to everyone, eligible for discovery)</option>
						<option value="unlisted">🔗 Unlisted (Only visible via direct URL link)</option>
						<option value="private">🔒 Private (Only visible to you and editors)</option>
					</select>
				</div>
			</div>

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
				</div>

				<div class="form-group">
					<label for="storeUrl">Web Store URL (Optional)</label>
					<input 
						type="text" 
						id="storeUrl" 
						name="storeUrl" 
						placeholder="https://chromewebstore.google.com/..." 
						disabled={loading || data.limitReached}
					/>
				</div>
			</div>

			<button type="submit" class="btn btn-primary btn-full" disabled={loading || data.limitReached}>
				{loading ? 'Creating Project...' : 'Create Project'}
			</button>
		</form>
	</div>
</div>

<style>
	.project-new-page {
		display: flex;
		justify-content: center;
		padding: 2rem 1.5rem;
	}

	.form-card {
		width: 100%;
		max-width: 700px;
	}

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
