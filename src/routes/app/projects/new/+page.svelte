<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import InfoTip from '$lib/components/InfoTip.svelte';
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';

	let { data, form } = $props();

	let loading = $state(false);
	let currentStep = $state(1);
	let projectName = $state('');
	let category = $state('');
	let pricingModel = $state('');
	let visibility = $state('unlisted');
	let storeUrl = $state('');
	let repositoryUrl = $state('');
	let isOpenSource = $state(false);

	const steps = [
		{ id: 1, label: 'Store listing' },
		{ id: 2, label: 'Project details' },
		{ id: 3, label: 'Visibility' }
	];

	async function showStep(step: number) {
		currentStep = Math.max(1, Math.min(3, step));
		await tick();
		document.getElementById(`step-${currentStep}-title`)?.focus();
	}

	async function continueFrom(step: number) {
		const panel = document.querySelector<HTMLElement>(`[data-form-step="${step}"]`);
		const controls = Array.from(panel?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea') ?? []);
		const repositoryControl = document.getElementById('repositoryUrl') as HTMLInputElement | null;
		if (step === 2 && repositoryControl) {
			repositoryControl.setCustomValidity(isOpenSource && !repositoryUrl.trim() ? 'Add a public repository URL for an open-source project.' : '');
		}
		const invalid = controls.find((control) => !control.checkValidity());
		if (invalid) {
			invalid.reportValidity();
			invalid.focus();
			return;
		}
		await showStep(step + 1);
	}
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

		<ol class="form-steps" aria-label="Project setup progress">
			{#each steps as step}
				<li class:active={currentStep === step.id} class:complete={currentStep > step.id}>
					<button type="button" onclick={() => showStep(step.id)} disabled={step.id > currentStep || loading} aria-current={currentStep === step.id ? 'step' : undefined}>
						<span>{currentStep > step.id ? '✓' : step.id}</span><strong>{step.label}</strong>
					</button>
				</li>
			{/each}
		</ol>

		<form 
			method="POST" 
			use:enhance={({ cancel }) => {
				if (currentStep !== 3 || loading) {
					cancel();
					return;
				}
				loading = true;
				return async ({ update }) => {
					try {
						await update({ reset: false });
					} finally {
						loading = false;
					}
				};
			}}
		>
			<section class="form-step" data-form-step="1" hidden={currentStep !== 1} aria-labelledby="step-1-title">
				<p class="step-kicker">Step 1 of 3</p>
				<h2 id="step-1-title" tabindex="-1">Identify the store listing</h2>
				<p class="step-description">Start with the extension name and Chrome Web Store listing. A valid listing creates the standard import source automatically.</p>

				<div class="form-group">
					<label for="name">Project Name</label>
					<input type="text" id="name" name="name" placeholder="e.g. Privacy Toolkit" required minlength="3" maxlength="100" bind:value={projectName} disabled={loading || data.limitReached} />
				</div>

				<div class="form-group">
					<label for="storeUrl">Chrome Web Store URL <InfoTip id="store-url-help" text="A valid Chrome Web Store item URL lets KoalaData create the standard import source and open the correct statistics dashboard for you." /></label>
					<input type="url" id="storeUrl" name="storeUrl" placeholder="https://chromewebstore.google.com/..." bind:value={storeUrl} disabled={loading || data.limitReached} />
					<small>Recommended. You can also connect it later from project settings.</small>
				</div>

				<div class="grid grid-2">
					<div class="form-group">
						<label for="category">Category</label>
						<select id="category" name="category" required bind:value={category} disabled={loading || data.limitReached}>
							<option value="" disabled>Select category...</option>
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
				</div>
				<div class="step-actions">
					<button type="button" class="btn btn-primary" onclick={() => continueFrom(1)} disabled={loading || data.limitReached}>Continue to details <Icon name="arrow-right" /></button>
				</div>
			</section>

			<section class="form-step" data-form-step="2" hidden={currentStep !== 2} aria-labelledby="step-2-title">
				<p class="step-kicker">Step 2 of 3</p>
				<h2 id="step-2-title" tabindex="-1">Describe the project</h2>
				<p class="step-description">Add the information people need to understand and classify the extension.</p>

				<fieldset class="classification-fieldset">
					<legend>Business model</legend>
					<p class="text-muted field-help">Shown as compact badges in Discover, leaderboards, and the public dashboard.</p>
					<div class="grid grid-2">
						<div class="form-group">
							<label for="pricingModel">Pricing</label>
							<select id="pricingModel" name="pricingModel" required bind:value={pricingModel} disabled={loading || data.limitReached}>
								<option value="" disabled>Select pricing...</option>
								<option value="free">Free</option>
								<option value="freemium">Freemium</option>
								<option value="paid">Paid</option>
							</select>
						</div>
						<label class="checkbox-option" for="isOpenSource">
							<input id="isOpenSource" name="isOpenSource" type="checkbox" bind:checked={isOpenSource} disabled={loading || data.limitReached} />
							<span><strong>Open Source</strong><small>Requires a public repository URL.</small></span>
						</label>
					</div>
				</fieldset>

				<div class="form-group">
					<label for="shortDescription">Short Description</label>
					<input type="text" id="shortDescription" name="shortDescription" placeholder="Brief sentence describing the project (max 200 characters)" required minlength="5" maxlength="200" disabled={loading || data.limitReached} />
				</div>

				<div class="form-group">
					<label for="fullDescription">Full Description</label>
					<textarea id="fullDescription" name="fullDescription" placeholder="Describe the extension features, metrics, and details..." rows="5" maxlength="2000" disabled={loading || data.limitReached}></textarea>
				</div>

				<div class="grid grid-2">
					<div class="form-group">
						<label for="websiteUrl">Website URL (Optional)</label>
						<input type="url" id="websiteUrl" name="websiteUrl" placeholder="https://example.com" disabled={loading || data.limitReached} />
					</div>
					<div class="form-group">
						<label for="repositoryUrl">Repository URL (Optional)</label>
						<input type="url" id="repositoryUrl" name="repositoryUrl" placeholder="https://github.com/..." bind:value={repositoryUrl} disabled={loading || data.limitReached} />
						<small>Required when marking the extension as open source.</small>
					</div>
				</div>
				<div class="step-actions">
					<button type="button" class="btn btn-secondary" onclick={() => showStep(1)} disabled={loading}>Back</button>
					<button type="button" class="btn btn-primary" onclick={() => continueFrom(2)} disabled={loading || data.limitReached}>Continue to visibility <Icon name="arrow-right" /></button>
				</div>
			</section>

			<section class="form-step" data-form-step="3" hidden={currentStep !== 3} aria-labelledby="step-3-title">
				<p class="step-kicker">Step 3 of 3</p>
				<h2 id="step-3-title" tabindex="-1">Choose visibility</h2>
				<p class="step-description">Start unlisted while reviewing the dashboard, or submit a public listing for moderation.</p>

				<div class="form-group">
					<label for="visibility">Visibility <InfoTip id="visibility-help" text="Unlisted is safest while preparing: project members can review the dashboard, but it is not shown in Discover. Public listings require administrator review." /></label>
					<select id="visibility" name="visibility" required bind:value={visibility} disabled={loading || data.limitReached}>
						<option value="unlisted">Unlisted (Recommended while preparing)</option>
						<option value="public">Public (Submitted for directory review)</option>
						<option value="private">Private (Only visible to you and editors)</option>
					</select>
				</div>

				<div class="review-card" aria-label="Project setup summary">
					<div><span>Project</span><strong>{projectName}</strong></div>
					<div><span>Category</span><strong>{category || 'Not selected'}</strong></div>
					<div><span>Pricing</span><strong>{pricingModel || 'Not selected'}</strong></div>
					<div><span>Store source</span><strong>{storeUrl ? 'Created automatically' : 'Connect later'}</strong></div>
					<div><span>Visibility</span><strong>{visibility}</strong></div>
				</div>

				<div class="step-actions">
					<button type="button" class="btn btn-secondary" onclick={() => showStep(2)} disabled={loading}>Back</button>
					<button type="submit" class="btn btn-primary" disabled={loading || data.limitReached}>
						{loading ? 'Creating Project...' : 'Create Project'}
					</button>
				</div>
			</section>
		</form>
		<noscript><style>.form-step[hidden] { display: block !important; }</style></noscript>
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
	.form-steps li { border: 1px solid var(--border-color); border-radius: var(--radius-md); color: var(--text-muted); font-size: 0.78rem; }
	.form-steps li.active { border-color: var(--primary); background: var(--primary-bg); color: var(--primary); }
	.form-steps li.complete { color: var(--success); }
	.form-steps button { display: flex; width: 100%; align-items: center; gap: 0.5rem; padding: 0.65rem; border: 0; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
	.form-steps button:disabled { cursor: default; opacity: 1; }
	.form-steps span { display: grid; place-items: center; width: 1.35rem; height: 1.35rem; border-radius: 50%; background: var(--primary-bg); color: var(--primary); font-weight: 800; }
	.form-steps li.complete span { background: var(--success-bg); color: var(--success); }
	.form-group small { display: block; margin-top: 0.35rem; color: var(--text-muted); font-size: 0.72rem; }
	@media (max-width: 560px) { .form-steps { grid-template-columns: 1fr; } }
	.form-step h2 { margin: 0 0 0.35rem; outline: none; }
	.step-kicker { margin: 0 0 0.2rem; color: var(--primary); font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
	.step-description { margin: 0 0 1.5rem; color: var(--text-muted); font-size: 0.9rem; }
	.step-actions { display: flex; justify-content: space-between; gap: 0.75rem; margin-top: 1.5rem; }
	.step-actions .btn:only-child { margin-left: auto; }
	.review-card { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; padding: 1rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--bg-inset); }
	.review-card div { min-width: 0; }
	.review-card span, .review-card strong { display: block; }
	.review-card span { color: var(--text-muted); font-size: 0.72rem; }
	.review-card strong { margin-top: 0.1rem; overflow-wrap: anywhere; font-size: 0.85rem; text-transform: capitalize; }
	@media (max-width: 560px) {
		.step-actions { flex-direction: column-reverse; }
		.step-actions .btn { width: 100%; }
		.review-card { grid-template-columns: 1fr; }
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

</style>
