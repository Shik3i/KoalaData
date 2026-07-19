<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let loading = $state(false);
</script>

<div class="admin-settings-page">
	<h1 class="page-title">Global Settings</h1>
	<p class="text-muted">Configure default system parameters, user quotas, and registration modes.</p>

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

	<div class="grid grid-2">
		<!-- Left: Form -->
		<div class="flex flex-col gap-2">
			<section class="card settings-card">
				<h2>System Configuration</h2>
				<hr class="divider" />
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
					<!-- Registration Mode -->
					<div class="form-group">
						<label for="site_title">Site Title</label>
						<input type="text" id="site_title" name="site_title" maxlength="60" value={data.settings.site_title || 'KoalaData'} required />
					</div>

					<div class="form-group">
						<label for="registration_mode">Registration Policy</label>
						<select id="registration_mode" name="registration_mode" required>
							<option value="open" selected={data.settings.registration_mode === 'open'}>
								Open Registration (Anyone can register and log in instantly)
							</option>
							<option value="approval_required" selected={data.settings.registration_mode === 'approval_required'}>
								Approval Required (Registrations must be approved by an administrator)
							</option>
							<option value="invite_only" selected={data.settings.registration_mode === 'invite_only'}>
								Invite Only / Closed (Disable new visitor registrations entirely)
							</option>
						</select>
					</div>

					<div class="form-group checkbox-group flex align-center gap-1">
						<input type="checkbox" id="public_discovery_enabled" name="public_discovery_enabled" value="true" checked={data.settings.public_discovery_enabled !== 'false'} />
						<label for="public_discovery_enabled">Enable public project discovery</label>
					</div>
					<div class="form-group checkbox-group flex align-center gap-1">
						<input type="checkbox" id="public_leaderboards_enabled" name="public_leaderboards_enabled" value="true" checked={data.settings.public_leaderboards_enabled !== 'false'} />
						<label for="public_leaderboards_enabled">Enable public leaderboards</label>
					</div>

					<!-- Default Max Projects -->
					<div class="form-group">
						<label for="default_max_projects">Default Max Projects Per User</label>
						<input 
							type="number" 
							id="default_max_projects" 
							name="default_max_projects" 
							value={data.settings.default_max_projects || '5'} 
							required 
						/>
					</div>

					<!-- Default Max Storage Bytes -->
					<div class="form-group">
						<label for="default_max_storage_bytes">Default Storage Quota (Bytes)</label>
						<input 
							type="number" 
							id="default_max_storage_bytes" 
							name="default_max_storage_bytes" 
							value={data.settings.default_max_storage_bytes || '26214400'} 
							required 
						/>
						<span class="text-muted help-text">e.g. 26,214,400 bytes = 25MB</span>
					</div>

					<!-- Default Max CSV Size Bytes -->
					<div class="form-group">
						<label for="default_max_csv_size_bytes">Default Max CSV File Size (Bytes)</label>
						<input 
							type="number" 
							id="default_max_csv_size_bytes" 
							name="default_max_csv_size_bytes" 
							value={data.settings.default_max_csv_size_bytes || '10485760'} 
							required 
						/>
						<span class="text-muted help-text">e.g. 10,485,760 bytes = 10MB</span>
					</div>

					<!-- Default Max CSV Rows -->
					<div class="form-group">
						<label for="default_max_csv_rows">Default Max CSV Rows Per Upload</label>
						<input 
							type="number" 
							id="default_max_csv_rows" 
							name="default_max_csv_rows" 
							value={data.settings.default_max_csv_rows || '100000'} 
							required 
						/>
					</div>

					<div class="form-group">
						<label for="session_max_age">Session Lifetime (Seconds)</label>
						<input
							type="number"
							id="session_max_age"
							name="session_max_age"
							min="300"
							value={data.settings.session_max_age || '2592000'}
							required
						/>
						<span class="text-muted help-text">2,592,000 seconds = 30 days</span>
					</div>

					<button type="submit" class="btn btn-primary" disabled={loading}>
						{loading ? 'Saving...' : 'Save Settings'}
					</button>
				</form>
			</section>
		</div>

		<!-- Right: Quick Info -->
		<div class="flex flex-col gap-2">
			<section class="card settings-card">
				<h2>Settings Guide</h2>
				<p class="text-muted">These settings form the fallback policy. You can override specific limits for any user individually via the **User Management** screen.</p>
				<hr class="divider" />
				<div class="flex flex-col gap-1 text-muted" style="font-size: 0.9rem; line-height: 1.4;">
					<div>
						<strong>Security Tip:</strong> Changing registration policy to "Invite Only" prevents new accounts from being created.
					</div>
					<div>
						<strong>Storage Quotas:</strong> Storage bounds only count active, un-reverted import CSV file sizes. Expired temporary upload drafts are cleared automatically and do not impact quota counts.
					</div>
				</div>
			</section>
		</div>
	</div>
</div>

<style>
	.page-title {
		margin-bottom: 0.25rem;
	}

	.divider {
		border: 0;
		border-top: 1px solid var(--border-color);
		margin: 1rem 0;
	}

	.help-text {
		font-size: 0.75rem;
		display: block;
		margin-top: -0.75rem;
		margin-bottom: 1rem;
	}
</style>
