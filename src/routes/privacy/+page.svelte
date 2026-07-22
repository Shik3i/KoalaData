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
				
				<h2>2. Connection & Security Data</h2>
				<p>
					The hosting provider or reverse proxy may process standard connection data required to deliver the site. Inside KoalaData, the current network address is used temporarily in memory for abuse prevention. When a network address is stored with a session or security audit event, IPv4 addresses are reduced to their /24 network and IPv6 addresses to at most the first three groups. A shortened browser user-agent may also be stored for session security.
				</p>
				<p><em>Legal basis: Art. 6(1)(f) GDPR (Legitimate interest in secure operations).</em></p>

				<h2>3. No Client Tracking</h2>
				<p>
					KoalaData does not use third-party analytics, tracking cookies, advertising networks, or external social media integrations. All features run locally on the server.
				</p>

				<h2>4. Registered Accounts</h2>
				<p>
					For registered extension developers, we store one public username, account status and role, and an Argon2id password hash. KoalaData does not require an email address and never stores the password itself. Account data is kept until deletion is requested or required for account administration.
				</p>
				<p>
					Login uses one essential HTTP-only session cookie. Only a SHA-256 hash of its random token is stored server-side. Sessions expire after the configured lifetime (30 days by default), are invalidated on logout, and expired records are cleaned automatically. No consent banner is shown because this cookie is necessary to provide the requested login.
				</p>
				<p><em>Legal basis: Art. 6(1)(b) GDPR (Providing the requested account) and Art. 6(1)(f) GDPR (Account security).</em></p>

				<h2>5. CSV Imports & Project Data</h2>
				<p>
					Uploaded CSV files, draft previews, project metadata, and derived observations are processed only to provide your dashboards. Draft files expire automatically; confirmed source files remain private to authorized project members and support import rollback. Project links and logos are never sent to a third-party favicon service.
				</p>

				<h2>6. External Links</h2>
				<p>
					GitHub and other project links are ordinary external links, not embedded trackers. Following one sends the usual connection data to that external provider under its own privacy policy.
				</p>

				<h2>7. Your Rights</h2>
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
				
				<h2>2. Verbindungs- & Sicherheitsdaten</h2>
				<p>
					Der Hosting-Anbieter oder Reverse Proxy kann die für die Auslieferung erforderlichen Standard-Verbindungsdaten verarbeiten. KoalaData verwendet die aktuelle Netzwerkadresse zur Missbrauchsabwehr vorübergehend im Arbeitsspeicher. Wird eine Netzwerkadresse zu einer Sitzung oder einem Sicherheitsereignis gespeichert, wird IPv4 auf das /24-Netz und IPv6 auf höchstens die ersten drei Gruppen gekürzt. Für die Sitzungssicherheit kann außerdem eine gekürzte Browserkennung gespeichert werden.
				</p>
				<p><em>Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (Berechtigtes Interesse an einem sicheren Betrieb).</em></p>

				<h2>3. Kein Client-Tracking</h2>
				<p>
					KoalaData verzichtet vollständig auf Drittanbieter-Analysetools, Werbenetzwerke, Tracking-Cookies oder externe Social-Media-Einbindungen. Alle Dienste laufen direkt lokal auf unserem Server.
				</p>

				<h2>4. Registrierte Konten</h2>
				<p>
					Für registrierte Entwickler speichern wir einen öffentlichen Benutzernamen, Kontostatus und Rolle sowie einen Argon2id-Passwort-Hash. KoalaData benötigt keine E-Mail-Adresse und speichert niemals das Passwort selbst. Kontodaten werden bis zur beantragten Löschung oder soweit für die Kontoverwaltung erforderlich aufbewahrt.
				</p>
				<p>
					Für die Anmeldung wird genau ein technisch notwendiges HTTP-only-Session-Cookie verwendet. Serverseitig wird nur der SHA-256-Hash des zufälligen Tokens gespeichert. Sitzungen verfallen nach der konfigurierten Laufzeit (standardmäßig 30 Tage), werden beim Abmelden ungültig gemacht und abgelaufene Einträge automatisch bereinigt. Da das Cookie für die gewünschte Anmeldung erforderlich ist, wird dafür kein Einwilligungsbanner angezeigt.
				</p>
				<p><em>Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Bereitstellung des gewünschten Kontos) und Art. 6 Abs. 1 lit. f DSGVO (Kontosicherheit).</em></p>

				<h2>5. CSV-Importe & Projektdaten</h2>
				<p>
					Hochgeladene CSV-Dateien, Entwurfsvorschauen, Projektmetadaten und daraus abgeleitete Messwerte werden ausschließlich für die Bereitstellung der Dashboards verarbeitet. Entwürfe verfallen automatisch; bestätigte Quelldateien bleiben für den Import-Rollback privat und sind nur für berechtigte Projektmitglieder zugänglich. Projektlinks und Logos werden nicht an einen externen Favicon-Dienst gesendet.
				</p>

				<h2>6. Externe Links</h2>
				<p>
					GitHub- und sonstige Projektlinks sind normale externe Links und keine eingebetteten Tracker. Beim Aufruf werden die üblichen Verbindungsdaten nach der Datenschutzerklärung des jeweiligen externen Anbieters übertragen.
				</p>

				<h2>7. Ihre Rechte</h2>
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
