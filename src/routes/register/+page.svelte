<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let loading = $state(false);
</script>

<svelte:head>
	<title>Register - KoalaData</title>
</svelte:head>

<div class="container auth-container">
	<div class="card auth-card">
		<h1 class="auth-title">Create Account</h1>
		
		{#if data.registrationMode === 'invite_only'}
			<div class="alert alert-warning">
				🔒 Public registration is currently closed. Only administrators can create new user accounts.
			</div>
			<div class="auth-actions">
				<a href="/" class="btn btn-secondary btn-full">Back to Home</a>
			</div>
		{:else}
			{#if data.registrationMode === 'approval_required'}
				<div class="registration-notice">
					🌱 <strong>Note:</strong> Registrations require administrator approval before you can access the platform.
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
					<label for="username">Username</label>
					<input 
						type="text" 
						id="username" 
						name="username" 
						placeholder="3 to 30 characters, a-z, 0-9, _, -, ." 
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
						placeholder="Minimum 8 characters" 
						required 
						disabled={loading}
					/>
				</div>

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
</style>
