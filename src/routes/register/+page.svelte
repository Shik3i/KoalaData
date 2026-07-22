<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let loading = $state(false);
	let showPassword = $state(false);
</script>

<svelte:head>
	<title>Register - KoalaData</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="container auth-container">
	<div class="card auth-card">
		<h1 class="auth-title">Create Account</h1>
		<p class="auth-intro">Create a publisher account to submit an extension, review imported Chrome Web Store reports and publish a shareable dashboard.</p>
		
		{#if data.registrationMode === 'invite_only'}
			<div class="alert alert-warning" role="status">
				<Icon name="lock-key" /> Public registration is currently closed. Only administrators can create new user accounts.
			</div>
			<div class="auth-actions">
				<a href="/" class="btn btn-secondary btn-full">Back to Home</a>
			</div>
		{:else}
			{#if data.registrationMode === 'approval_required'}
				<div class="registration-notice">
					<Icon name="user-plus" /> <strong>Approval required.</strong> After registering, return to the login page later to check your status. KoalaData does not collect an email address, so no approval email is sent.
				</div>
			{/if}

			{#if form?.error}
				<div class="alert alert-danger" role="alert">
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
					<label for="username">Username</label>
					<input 
						type="text" 
						id="username" 
						name="username" 
						autocomplete="username"
						placeholder="3 to 30 characters, a-z, 0-9, _, -, ." 
						required 
						disabled={loading}
					/>
					<small>Your public publisher name. Use 3 to 30 letters, numbers, dots, underscores, or hyphens.</small>
				</div>

				<div class="form-group">
					<label for="password">Password</label>
					<div class="password-field">
					<input 
						type={showPassword ? 'text' : 'password'}
						id="password" 
						name="password" 
						autocomplete="new-password"
						placeholder="Minimum 8 characters" 
						required 
						disabled={loading}
					/>
					<button type="button" class="password-toggle" aria-pressed={showPassword} onclick={() => showPassword = !showPassword}>{showPassword ? 'Hide' : 'Show'}</button>
					</div>
					<small>At least 8 characters. Use a unique password; passwords are stored only as secure hashes.</small>
				</div>

				<p class="terms-note">By registering, you agree to the <a href="/terms">Terms of Use</a> and acknowledge the <a href="/privacy">Privacy Policy</a>.</p>

				<button type="submit" class="btn btn-primary btn-full" disabled={loading}>
					{loading ? 'Creating Account...' : 'Register'}
				</button>
			</form>

			<div class="auth-footer text-muted">
				Already have an account? <a href="/login">Log in</a>
			</div>
		{/if}
	</div>
</div>

<style>
	.auth-container {
		display: flex;
		justify-content: center;
		padding: 3rem 1.5rem;
	}

	.auth-card {
		width: 100%;
		max-width: 450px;
	}

	.auth-title {
		text-align: center;
		margin-bottom: 1.5rem;
	}
	.auth-intro { margin: -0.75rem 0 1.5rem; color: var(--text-muted); font-size: 0.9rem; line-height: 1.55; text-align: center; }
	.form-group small { display: block; margin-top: 0.35rem; color: var(--text-muted); font-size: 0.75rem; line-height: 1.4; }
	.password-field { position: relative; }
	.password-field input { padding-right: 4.25rem; }
	.password-toggle { position: absolute; top: 50%; right: 0.5rem; transform: translateY(-50%); border: 0; background: transparent; color: var(--primary); font-size: 0.75rem; font-weight: 700; cursor: pointer; }
	.terms-note { margin: 0 0 1rem; color: var(--text-muted); font-size: 0.75rem; line-height: 1.45; }
	.terms-note a { text-decoration: underline; }

	.registration-notice {
		background-color: var(--primary-bg);
		color: var(--primary);
		padding: 0.75rem 1rem;
		border-radius: var(--radius-md);
		font-size: 0.85rem;
		margin-bottom: 1.5rem;
		border: 1px solid hsl(var(--primary-hue), 25%, 85%);
	}

	.form-group {
		margin-bottom: 1.25rem;
	}

	.btn-full {
		width: 100%;
	}

	.auth-footer {
		text-align: center;
		margin-top: 1.5rem;
		font-size: 0.9rem;
	}
	.auth-footer a { text-decoration: underline; text-underline-offset: 0.18em; font-weight: 600; }
	@media (max-width: 640px) { .auth-container { padding-block: 1rem; } }
</style>
