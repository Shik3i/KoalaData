<svelte:head>
	<title>Terms of Use - KoalaData</title>
	<meta name="description" content="Terms for publishing browser extension metrics on KoalaData." />
</svelte:head>

<div class="container legal-page">
	<article class="card legal-card">
		<h1>Terms of Use / Nutzungsbedingungen</h1>
		<p class="lead">Plain-language rules for submitting extension listings and Chrome Web Store statistics.</p>
		<section>
			<h2>Publishing responsibilities</h2>
			<p>You may publish only extensions and aggregate statistics that you are authorized to manage. Listings, descriptions and external links must be accurate and must not impersonate another publisher.</p>
			<h2>Metrics and verification</h2>
			<p>Uploaded CSV files must contain aggregate data and no personal or user-level information. A verified badge means an administrator reviewed the listing and its evidence; it is not an endorsement or guarantee.</p>
			<h2>Moderation</h2>
			<p>KoalaData may hide or remove misleading, unsafe, unlawful, spam-oriented or abandoned listings. New public listings remain under review until approved. Approved external links are ordinary crawlable links, but KoalaData does not promise search-engine ranking benefits.</p>
			<h2>Availability and deletion</h2>
			<p>The service is provided without an availability guarantee. Publishers can request account or project deletion using the contact details in the imprint.</p>
		</section>
		<hr />
		<section lang="de">
			<h2>Pflichten bei Veröffentlichungen</h2>
			<p>Du darfst nur Extensions und aggregierte Statistiken veröffentlichen, zu deren Verwaltung du berechtigt bist. Einträge, Beschreibungen und externe Links müssen korrekt sein.</p>
			<h2>Metriken und Verifizierung</h2>
			<p>CSV-Dateien dürfen nur aggregierte Daten und keine personenbezogenen Einzeldaten enthalten. Ein Verifizierungsabzeichen bedeutet, dass Eintrag und Nachweise administrativ geprüft wurden; es ist keine Empfehlung oder Garantie.</p>
			<h2>Moderation</h2>
			<p>Irreführende, unsichere, rechtswidrige, primär für Linkspam angelegte oder verwaiste Einträge können ausgeblendet oder entfernt werden. Neue öffentliche Einträge bleiben bis zur Freigabe in Prüfung. Freigegebene externe Links sind normal crawlbar; ein Einfluss auf Suchmaschinen-Rankings wird nicht zugesichert.</p>
		</section>
	</article>
</div>

<style>
	.legal-page { max-width: 860px; padding-block: 2.5rem; }
	.legal-card { padding: clamp(1.25rem, 4vw, 2.5rem); }
	h1 { margin-bottom: 0.5rem; }
	.lead { color: var(--text-muted); }
	section { margin-top: 2rem; }
	h2 { margin: 1.5rem 0 0.5rem; font-size: 1.2rem; }
	p { color: var(--text-muted); line-height: 1.65; }
	hr { margin: 2.25rem 0; border: 0; border-top: 1px solid var(--border-color); }
</style>
