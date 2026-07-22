<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';

	let { data, form } = $props();

	let loading = $state(false);
	let showPassword = $state(false);
	let redirectTo = $derived(page.url.searchParams.get('redirectTo') || '/app');
</script>

<svelte:head>
	<title>Log In - KoalaData</title>
</svelte:head>

<div class="container auth-container">
	<div class="card auth-card">
		<h1 class="auth-title">Welcome Back</h1>
		<p class="auth-intro">Sign in with the username and password you chose. KoalaData does not use email addresses or social logins.</p>

		{#if data.successMessage}
			<div class="alert alert-success" role="status">
				{data.successMessage}
			</div>
		{/if}

		{#if data.errorMessage}
			<div class="alert alert-danger" role="alert">
				{data.errorMessage}
			</div>
		{/if}

		{#if form?.error}
			<div class="alert alert-danger" role="alert">
				{form.error}
			</div>
		{/if}

		<form 
			action="?/login" 
			method="POST" 
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					loading = false;
					update();
				};
			}}
		>
			<input type="hidden" name="redirectTo" value={redirectTo} />

			<div class="form-group">
				<label for="username">Username</label>
				<input 
					type="text" 
					id="username" 
					name="username" 
					autocomplete="username"
					placeholder="Enter your username" 
					required 
					disabled={loading}
				/>
			</div>

			<div class="form-group">
				<label for="password">Password</label>
				<div class="password-field">
				<input 
					type={showPassword ? 'text' : 'password'}
					id="password" 
					name="password" 
					autocomplete="current-password"
					placeholder="Enter your password" 
					required 
					disabled={loading}
				/>
					<button type="button" onclick={() => showPassword = !showPassword} aria-pressed={showPassword}>{showPassword ? 'Hide' : 'Show'}</button>
				</div>
			</div>

			<button type="submit" class="btn btn-primary btn-full" disabled={loading}>
				{loading ? 'Logging in...' : 'Log In'}
			</button>
		</form>

		<div class="auth-footer text-muted">
			<p>Don't have an account? <a href="/register">Register</a></p>
			<p>No email-based reset is possible. For account recovery, contact the operator through the <a href="/imprint">imprint</a>.</p>
		</div>

		<aside class="privacy-note" aria-label="Login privacy">
			<strong>Private by default</strong>
			<span>Your password is verified against an Argon2id hash. An essential HTTP-only session cookie keeps you signed in; there are no analytics or advertising cookies.</span>
			<a href="/privacy">How login and session data are handled</a>
		</aside>
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
		max-width: 420px;
	}

	.auth-title {
		text-align: center;
		margin-bottom: 0.5rem;
	}
	.auth-intro { margin: 0 auto 1.5rem; max-width: 34rem; color: var(--text-muted); text-align: center; font-size: 0.9rem; line-height: 1.55; }

	.form-group {
		margin-bottom: 1.25rem;
	}

	.btn-full {
		width: 100%;
	}
	.password-field { position: relative; }
	.password-field input { padding-right: 4rem; }
	.password-field button { position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); border: 0; background: transparent; color: var(--primary); font: inherit; font-size: 0.75rem; font-weight: 700; cursor: pointer; }

	.auth-footer {
		text-align: center;
		margin-top: 1.5rem;
		font-size: 0.9rem;
	}
	.auth-footer p { margin: 0.45rem 0; }
	.auth-footer a { text-decoration: underline; text-underline-offset: 0.18em; font-weight: 600; }
	.privacy-note { display: grid; gap: 0.35rem; margin-top: 1.25rem; padding: 0.9rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--bg-inset); font-size: 0.78rem; line-height: 1.5; color: var(--text-muted); }
	.privacy-note strong { color: var(--text-base); }
	.privacy-note a { width: fit-content; text-decoration: underline; text-underline-offset: 0.18em; font-weight: 700; }
	@media (max-width: 640px) { .auth-container { padding-block: 1rem; } }
</style>
