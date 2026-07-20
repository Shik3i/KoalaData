<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
</script>

<svelte:head>
	<title>Imprint / Legal Notice - KoalaData</title>
</svelte:head>

<div class="container legal-page">
	<div class="card legal-card">
		<h1 class="page-title"><Icon name="clipboard-text" /> Legal Notice / Impressum</h1>
		<p class="text-muted text-center subtitle">Contact information and operator details / Anbieterkennzeichnung nach § 5 DDG</p>
		
		<hr class="divider" />

		<div class="grid grid-2 legal-grid">
			<!-- English Section -->
			<section class="legal-section">
				<h2>Operator & Contact</h2>
				<p><strong>Timo Schmidt</strong></p>
				<p>E-Mail: <a href="mailto:koalasync@koalastuff.net">koalasync@koalastuff.net</a></p>
				<p>Mastodon: <a href="https://mastodon.social/@koalastuff" target="_blank" rel="noopener noreferrer">@koalastuff on Mastodon</a></p>
				
				<h2 style="margin-top: 2rem;">Dispute Resolution</h2>
				<p>
					The European Commission provides a platform for online dispute resolution (ODR): 
					<a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">https://ec.europa.eu/consumers/odr</a>.
					I am not willing or obliged to participate in dispute resolution proceedings before a consumer arbitration board.
				</p>

				<h2 style="margin-top: 2rem;">Liability for Links</h2>
				<p>
					Our site contains links to external third-party websites. We have no influence on the contents of those websites, therefore we cannot guarantee for those contents. Providers or administrators of linked websites are always responsible for their own contents.
				</p>
			</section>

			<!-- German Section -->
			<section class="legal-section border-left">
				<h2>Angaben gemäß § 5 DDG</h2>
				<p><strong>Timo Schmidt</strong></p>
				<p>E-Mail: <a href="mailto:koalasync@koalastuff.net">koalasync@koalastuff.net</a></p>
				<p>Mastodon: <a href="https://mastodon.social/@koalastuff" target="_blank" rel="noopener noreferrer">@koalastuff on Mastodon</a></p>

				<h2 style="margin-top: 2rem;">Streitschlichtung</h2>
				<p>
					Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: 
					<a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">https://ec.europa.eu/consumers/odr</a>.<br />
					Ich bin nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
				</p>

				<h2 style="margin-top: 2rem;">Haftung für Links</h2>
				<p>
					Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
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
		margin-bottom: 1rem;
		color: var(--text-base);
		font-weight: 600;
	}
	.legal-section p {
		font-size: 0.95rem;
		line-height: 1.6;
		color: var(--text-muted);
		margin-bottom: 0.75rem;
	}
	.legal-section a {
		color: var(--primary);
		text-decoration: underline;
	}
	.legal-section a:hover {
		color: var(--primary-hover);
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
