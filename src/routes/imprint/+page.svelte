<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import Seo from '$lib/components/Seo.svelte';
</script>

<Seo
	title="Legal Notice | KoalaData"
	description="Operator, contact, project, liability, license, copyright, and dispute-resolution information for KoalaData."
	canonicalPath="/imprint"
/>

<div class="container legal-page">
	<article class="card legal-card">
		<h1 class="page-title"><Icon name="clipboard-text" /> Legal Notice</h1>
		<p class="subtitle">Operator, contact, and project information</p>

		<section>
			<h2>Operator and contact</h2>
			<p><strong>Timo Schmidt</strong></p>
			<p>Email: <a href="mailto:koaladata@koalastuff.net">koaladata@koalastuff.net</a></p>
			<p>Private message: <a href="https://mastodon.social/@koalastuff" target="_blank" rel="me noopener noreferrer">@koalastuff on Mastodon</a></p>
		</section>

		<section>
			<h2>Project information</h2>
			<p>KoalaData is an open-source platform for importing and publishing aggregate Chrome Web Store statistics. The source code is available on <a href="https://github.com/Shik3i/KoalaData" target="_blank" rel="noopener noreferrer">GitHub</a> under the MIT License.</p>
			<p>Report bugs through <a href="https://github.com/Shik3i/KoalaData/issues" target="_blank" rel="noopener noreferrer">GitHub Issues</a>. Report security vulnerabilities privately through the <a href="/security">security page</a>.</p>
		</section>

		<section>
			<h2>Liability for content and links</h2>
			<p>The contents of this website were prepared with care. I cannot guarantee that all information is always complete, accurate, or current.</p>
			<p>This website links to third-party services. I do not control their content. The respective provider or operator is responsible for linked pages. Links to unlawful content will be removed when identified.</p>
		</section>

		<section>
			<h2>License and copyright</h2>
			<p>Unless otherwise stated, the KoalaData source code is licensed under the MIT License. Project names, logos, graphics, website copy, and other non-code assets may be subject to separate rights unless the repository explicitly includes them under that license.</p>
		</section>

		<section>
			<h2>Dispute resolution</h2>
			<p>I am not willing or obliged to participate in dispute resolution proceedings before a consumer arbitration board.</p>
		</section>
	</article>
</div>

<style>
	.legal-page { max-width: 800px; padding-block: 2.5rem; }
	.legal-card { padding: clamp(1.25rem, 4vw, 2.5rem); }
	.page-title { display: flex; align-items: center; justify-content: center; gap: 0.55rem; margin: 0; color: var(--primary); text-align: center; }
	.subtitle { margin: 0.65rem 0 2rem; color: var(--text-muted); text-align: center; }
	section { margin-top: 1.75rem; }
	section:first-of-type { margin-top: 0; padding-top: 2rem; border-top: 1px solid var(--border-color); }
	h2 { margin: 0 0 0.65rem; font-size: 1.2rem; }
	p { margin: 0.55rem 0; color: var(--text-muted); line-height: 1.65; }
	a { text-decoration: underline; text-underline-offset: 0.16em; }
</style>
