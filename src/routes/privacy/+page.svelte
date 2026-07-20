<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
</script>

<svelte:head>
	<title>Privacy Policy - KoalaData</title>
</svelte:head>

<div class="container legal-page">
	<div class="card legal-card">
		<h1 class="page-title"><Icon name="lock-key" /> Privacy Policy / Datenschutzerklärung</h1>
		<p class="text-muted text-center subtitle">How we handle your data / Informationen zum Schutz Ihrer persönlichen Daten</p>
		
		<hr class="divider" />

		<div class="grid grid-2 legal-grid">
			<!-- English Section -->
			<section class="legal-section">
				<h2>1. Overview & Hosting</h2>
				<p>
					We take privacy seriously. KoalaData is hosted on server infrastructure provided by Hetzner Online GmbH (Industriestr. 25, 91710 Gunzenhausen, Germany). The servers are located within the EU/EEA.
				</p>
				
				<h2>2. Server Access Logs</h2>
				<p>
					When accessing this platform, standard connection data is processed in server access logs (including your anonymized IP address, timestamp, browser type, and request path). This log data is used solely to maintain stability and prevent abuse, and is automatically purged after 7 days.
				</p>
				<p><em>Legal basis: Art. 6(1)(f) GDPR (Legitimate interest in secure operations).</em></p>

				<h2>3. No Client Tracking</h2>
				<p>
					KoalaData does not use third-party analytics, tracking cookies, advertising networks, or external social media integrations. All features run locally on the server.
				</p>

				<h2>4. Registered Accounts</h2>
				<p>
					For registered extension developers, we store your username, display name, and a secure password hash. This data is kept until you request account deletion.
				</p>

				<h2>5. Your Rights</h2>
				<p>
					You have the right to request access to, correction of, or deletion of your personal data stored on this platform. Please contact us via the imprint information.
				</p>
			</section>

			<!-- German Section -->
			<section class="legal-section border-left">
				<h2>1. Übersicht & Hosting</h2>
				<p>
					Wir nehmen den Datenschutz ernst. KoalaData wird auf Servern der Hetzner Online GmbH (Industriestr. 25, 91710 Gunzenhausen, Deutschland) gehostet. Die Rechenzentren befinden sich innerhalb der EU/EWR.
				</p>
				
				<h2>2. Server-Protokolldateien</h2>
				<p>
					Beim Zugriff auf diese Plattform werden Standard-Verbindungsdaten in Server-Logs verarbeitet (anonymisierte IP-Adresse, Zeitstempel, Browsertyp und aufgerufene URL). Diese Protokolldaten dienen ausschließlich der Sicherstellung des Betriebs und der Missbrauchserkennung und werden nach 7 Tagen automatisch gelöscht.
				</p>
				<p><em>Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (Berechtigtes Interesse an einem sicheren Betrieb).</em></p>

				<h2>3. Kein Client-Tracking</h2>
				<p>
					KoalaData verzichtet vollständig auf Drittanbieter-Analysetools, Werbenetzwerke, Tracking-Cookies oder externe Social-Media-Einbindungen. Alle Dienste laufen direkt lokal auf unserem Server.
				</p>

				<h2>4. Registrierte Konten</h2>
				<p>
					Für registrierte Entwickler speichern wir den Benutzernamen, den Anzeigenamen sowie einen sicheren Passwort-Hash. Diese Daten werden bis zur Löschung des Accounts aufbewahrt.
				</p>

				<h2>5. Ihre Rechte</h2>
				<p>
					Sie haben das Recht auf Auskunft, Berichtigung oder Löschung Ihrer auf dieser Plattform gespeicherten personenbezogenen Daten. Wenden Sie sich hierzu bitte an die im Impressum angegebenen Kontaktwege.
				</p>
			</section>
		</div>
	</div>
</div>

<style>
	.legal-page {
		padding-block: 2.5rem;
		max-width: 900px;
	}
	.legal-card {
		padding: 2.5rem;
		background-color: var(--bg-surface);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-md);
	}
	.page-title {
		text-align: center;
		font-size: 2rem;
		margin-bottom: 0.5rem;
		color: var(--primary);
	}
	.subtitle {
		margin-bottom: 1.5rem;
	}
	.divider {
		border: 0;
		border-top: 1px solid var(--border-color);
		margin-bottom: 2rem;
	}
	.legal-grid {
		gap: 2.5rem;
	}
	.legal-section h2 {
		font-size: 1.25rem;
		margin-bottom: 0.8rem;
		margin-top: 1.5rem;
		color: var(--text-base);
		font-weight: 600;
	}
	.legal-section h2:first-of-type {
		margin-top: 0;
	}
	.legal-section p {
		font-size: 0.95rem;
		line-height: 1.6;
		color: var(--text-muted);
		margin-bottom: 0.75rem;
	}
	.border-left {
		border-left: 1px solid var(--border-color);
		padding-left: 2.5rem;
	}

	@media (max-width: 768px) {
		.grid-2 {
			grid-template-columns: 1fr;
		}
		.border-left {
			border-left: none;
			padding-left: 0;
			border-top: 1px solid var(--border-color);
			padding-top: 2rem;
		}
		.legal-card {
			padding: 1.5rem;
		}
	}
</style>
