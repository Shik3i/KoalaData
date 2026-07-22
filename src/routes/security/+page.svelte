<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
</script>

<Seo
	title="Security and Responsible Disclosure | KoalaData"
	description="Review KoalaData's account, session, upload, moderation, and private vulnerability-reporting safeguards."
	canonicalPath="/security"
/>

<div class="container security-page">
	<article class="card">
		<p class="kicker">Trust center</p>
		<h1>Security and responsible disclosure</h1>
		<p class="lead">KoalaData imports aggregate CSV reports. It does not require an extension SDK and never publishes original upload files.</p>
		<div class="security-grid">
			<section><h2>Accounts</h2><p>Passwords are stored as hashes, sessions use HTTP-only cookies, administrative actions are audited and seeded administrator passwords must be changed.</p></section>
			<section><h2>Uploads</h2><p>File size and row limits, content checks, private storage, explicit previews and reversible import batches constrain CSV processing.</p></section>
			<section><h2>Public listings</h2><p>New listings require review. External links use HTTPS validation, and verification has a narrow documented meaning.</p></section>
			<section><h2>Report a vulnerability</h2><p>Use a <a href="https://github.com/Shik3i/KoalaData/security/advisories/new" target="_blank" rel="noopener noreferrer">private GitHub security advisory</a> or email <a href="mailto:koaladata@koalastuff.net?subject=KoalaData%20security%20report">koaladata@koalastuff.net</a>. Do not include credentials, session cookies or personal data.</p></section>
		</div>
	</article>
</div>

<style>
	.security-page { max-width: 920px; padding-block: 2.5rem; }
	article { padding: clamp(1.25rem, 4vw, 2.5rem); }
	.kicker { margin: 0 0 0.4rem; color: var(--primary); font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
	h1 { margin-bottom: 0.75rem; }
	.lead { max-width: 48rem; color: var(--text-muted); line-height: 1.65; }
	.security-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-top: 2rem; }
	section { padding: 1rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--bg-inset); }
	h2 { margin: 0 0 0.5rem; font-size: 1.05rem; }
	section p { margin: 0; color: var(--text-muted); font-size: 0.85rem; line-height: 1.55; }
	section a { text-decoration: underline; text-underline-offset: 0.15em; }
	@media (max-width: 640px) { .security-grid { grid-template-columns: 1fr; } }
</style>
