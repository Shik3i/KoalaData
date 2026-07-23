<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
</script>

<Seo
	title="Terms of Use | KoalaData"
	description="Rules for authorized Chrome Web Store metric uploads, listing accuracy, verification, moderation, availability, and deletion on KoalaData."
	canonicalPath="/terms"
/>

<div class="container legal-page">
	<article class="card legal-card">
		<h1>Terms of Use</h1>
		<p class="lead">Plain-language rules for submitting extension listings and Chrome Web Store statistics.</p>
		<p class="updated">Last updated: 22 July 2026</p>
		<section>
			<h2>Publishing responsibilities</h2>
			<p>You may publish only extensions and aggregate statistics that you are authorized to manage. Listings, descriptions and external links must be accurate and must not impersonate another publisher.</p>
			<h2>Metrics and verification</h2>
			<p>Uploaded CSV files must contain aggregate data and no personal or user-level information. A verified badge means an administrator reviewed the listing and its evidence; it is not an endorsement or guarantee.</p>
			<h2>Moderation</h2>
			<p>KoalaData may hide or remove misleading, unsafe, unlawful, spam-oriented or abandoned listings. New public listings remain under review until approved. Approved profiles use standard dofollow links, but KoalaData does not promise search-engine ranking benefits.</p>
			<h2>Availability and deletion</h2>
			<p>The service is provided without an availability guarantee. Publishers can request account or project deletion using the contact details in the <a href="https://koalastuff.net/legal">Legal Notice</a>.</p>
		</section>
	</article>
</div>

<style>
	.legal-page { max-width: 860px; padding-block: 2.5rem; }
	.legal-card { padding: clamp(1.25rem, 4vw, 2.5rem); }
	h1 { margin-bottom: 0.5rem; }
	.lead { color: var(--text-muted); }
	.updated { margin-top: 0.5rem; color: var(--text-muted); font-size: 0.8rem; }
	section { margin-top: 2rem; }
	h2 { margin: 1.5rem 0 0.5rem; font-size: 1.2rem; }
	p { color: var(--text-muted); line-height: 1.65; }
	a { text-decoration: underline; text-underline-offset: 0.16em; }
</style>
