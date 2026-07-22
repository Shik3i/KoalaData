<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head><title>{page.status} - KoalaData</title><meta name="robots" content="noindex" /></svelte:head>

<div class="container error-page">
	<div class="card">
		<p class="status">{page.status}</p>
		<h1>{page.status === 404 ? (page.error?.message || 'This page could not be found.') : 'Something went wrong.'}</h1>
		<p>{page.status === 404 ? 'The dashboard may be private, awaiting review, renamed or removed.' : 'Please retry. If the problem continues, report it through the security or imprint contact.'}</p>
		<div><a class="btn btn-primary" href="/">Back to home</a> <a class="btn btn-secondary" href="/discover">Explore dashboards</a></div>
	</div>
</div>

<style>
	.error-page { display: grid; place-items: center; min-height: 60vh; padding-block: 2rem; }
	.card { width: min(36rem, 100%); padding: 2rem; text-align: center; }
	.status { margin: 0; color: var(--primary); font-size: 3rem; font-weight: 850; }
	.card > p:not(.status) { color: var(--text-muted); line-height: 1.6; }
	.card > div { display: flex; justify-content: center; flex-wrap: wrap; gap: 0.75rem; margin-top: 1.5rem; }
</style>
