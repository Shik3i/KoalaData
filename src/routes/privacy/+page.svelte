<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import Seo from '$lib/components/Seo.svelte';
</script>

<Seo
	title="Privacy Policy | KoalaData"
	description="How KoalaData processes seven-day webserver access logs, account and session records, private CSV imports, security data, and GDPR requests."
	canonicalPath="/privacy"
/>

<div class="container legal-page">
	<article class="card legal-card">
		<h1 class="page-title"><Icon name="lock-key" /> Privacy Policy</h1>
		<p class="subtitle">How KoalaData processes account, security, and report data</p>
		<p class="updated">Last updated: 22 July 2026</p>

		<section>
			<h2>1. Operator and hosting</h2>
			<p>The operator named in the <a href="https://koalastuff.net/legal">Legal Notice</a> is responsible for this service. KoalaData is hosted on infrastructure provided by Hetzner Online GmbH, Industriestr. 25, 91710 Gunzenhausen, Germany. The regular hosting location is within the EU/EEA.</p>
		</section>

		<section>
			<h2>2. Connection and security data</h2>
			<p>The web server keeps access logs for seven days. These logs may contain the IP address, request date and time, requested method and path, response status, referrer, and browser user agent. They are used to operate and troubleshoot the service and to detect and block bad actors, spam, denial-of-service attacks, and other abuse. Access logs are not used for advertising, profiling, or audience analytics and are deleted automatically after seven days.</p>
			<p>KoalaData also uses the current network address temporarily in memory for rate limiting and abuse prevention. When a network address is stored with a session or security audit event, IPv4 addresses are reduced to their /24 network and IPv6 addresses to at most the first three groups. A shortened browser user agent may also be stored for session security.</p>
			<p><em>Legal basis: Art. 6(1)(f) GDPR, legitimate interest in reliable service delivery, technical troubleshooting, secure operation, and abuse prevention.</em></p>
		</section>

		<section>
			<h2>3. Accounts and sessions</h2>
			<p>Account and session records are personal data when they relate to an identifiable user. For registered publishers, KoalaData stores a public username, account status, role, account timestamps, and an Argon2id password hash. It does not require an email address and never stores the password itself. Account data is retained until deletion is requested or it is required for account administration.</p>
			<p>Login uses one essential HTTP-only session cookie. Only a SHA-256 hash of its random token is stored on the server. Sessions expire after the configured lifetime, 30 days by default, are invalidated on logout, and are removed after expiry. This cookie is required for the requested login, so no consent banner is shown for it.</p>
			<p><em>Legal basis: Art. 6(1)(b) GDPR, providing the requested account, and Art. 6(1)(f) GDPR, account security.</em></p>
		</section>

		<section>
			<h2>4. CSV imports and project data</h2>
			<p>Uploaded CSV files, draft previews, project metadata, and derived observations are processed to provide project dashboards. Draft files expire automatically. Confirmed source files remain private to authorized project members and support import rollback. Public dashboards expose only approved project information and aggregate metrics, never the original CSV files.</p>
			<p>Project links and logos are not sent to a third-party favicon service.</p>
			<p><em>Legal basis: Art. 6(1)(b) GDPR, providing the requested dashboard and import features.</em></p>
		</section>

		<section>
			<h2>5. No advertising or client tracking</h2>
			<p>KoalaData does not use third-party analytics, tracking cookies, advertising networks, social embeds, or profiling. It does not use automated decision-making within the meaning of Art. 22 GDPR.</p>
		</section>

		<section>
			<h2>6. External links</h2>
			<p>GitHub, store, and publisher links are ordinary external links, not embedded trackers. Opening one sends the usual connection data to that provider under its own privacy policy.</p>
		</section>

		<section>
			<h2>7. Your rights</h2>
			<p>Under the GDPR, you may have rights to access, rectification, erasure, restriction of processing, data portability, objection, and lodging a complaint with a supervisory authority. Use the contact details in the <a href="https://koalastuff.net/legal">Legal Notice</a> for privacy requests.</p>
		</section>
	</article>
</div>

<style>
	.legal-page { max-width: 800px; padding-block: 2.5rem; }
	.legal-card { padding: clamp(1.25rem, 4vw, 2.5rem); }
	.page-title { display: flex; align-items: center; justify-content: center; gap: 0.55rem; margin: 0; color: var(--primary); text-align: center; }
	.subtitle { margin: 0.65rem 0 0; color: var(--text-muted); text-align: center; }
	.updated { margin: 0.45rem 0 2rem; color: var(--text-muted); font-size: 0.8rem; text-align: center; }
	section { margin-top: 1.75rem; }
	section:first-of-type { padding-top: 2rem; border-top: 1px solid var(--border-color); }
	h2 { margin: 0 0 0.65rem; font-size: 1.2rem; }
	p { margin: 0.55rem 0; color: var(--text-muted); line-height: 1.65; }
	a { text-decoration: underline; text-underline-offset: 0.16em; }
</style>
