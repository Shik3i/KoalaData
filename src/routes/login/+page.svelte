<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';

	let { data, form } = $props();

	let loading = $state(false);
	let redirectTo = $derived(page.url.searchParams.get('redirectTo') || '/app');
</script>

<svelte:head>
	<title>Log In - KoalaData</title>
</svelte:head>

<div class="container auth-container">
	<div class="card auth-card">
		<h1 class="auth-title">Welcome Back</h1>

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
				<input 
					type="password" 
					id="password" 
					name="password" 
					autocomplete="current-password"
					placeholder="Enter your password" 
					required 
					disabled={loading}
				/>
			</div>

			<button type="submit" class="btn btn-primary btn-full" disabled={loading}>
				{loading ? 'Logging in...' : 'Log In'}
			</button>
		</form>

		<div class="auth-footer text-muted">
			Don't have an account? <a href="/register">Register</a>
		</div>
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
		margin-bottom: 1.5rem;
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
