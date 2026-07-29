<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import {
		CHART_EXPORT_FORMATS,
		buildChartShareText,
		type ChartExportFormat,
		type ChartExportOptions,
		type ChartExportTheme
	} from '$lib/chart-export';

	let {
		isOpen = false,
		onClose,
		renderPng,
		renderGif,
		filename,
		projectName,
		projectDescription,
		heading,
		timeframe,
		shareUrl,
		insight,
		initialMovingAverage = false,
		hasMovingAverage = false,
		hasEvents = false,
		hasLogo = false
	} = $props<{
		isOpen?: boolean;
		onClose?: () => void;
		renderPng: (options: ChartExportOptions) => Promise<Blob>;
		renderGif: (options: ChartExportOptions, onProgress: (progress: number) => void) => Promise<Blob>;
		filename: string;
		projectName?: string;
		projectDescription?: string;
		heading?: string;
		timeframe?: string;
		shareUrl?: string;
		insight?: string;
		initialMovingAverage?: boolean;
		hasMovingAverage?: boolean;
		hasEvents?: boolean;
		hasLogo?: boolean;
	}>();

	let modalRef: HTMLDivElement | undefined = $state();
	let theme = $state<ChartExportTheme>('current');
	let format = $state<ChartExportFormat>('wide');
	let includeMovingAverage = $state(false);
	let includeEvents = $state(false);
	let includeIdentity = $state(false);
	let includeTitle = $state(true);
	let includeValue = $state(true);
	let includeInsight = $state(false);
	let includeDetails = $state(true);
	let includeBranding = $state(true);
	let includeLogo = $state(false);
	let identitySubtitle = $state('');
	let subtitleInitialized = $state(false);
	let customText = $state('');
	let chartHeightPercent = $state(68);
	let layoutPreset = $state<'focus' | 'balanced' | 'minimal' | 'custom'>('focus');
	let previewDataUrl = $state('');
	let previewing = $state(false);
	let action = $state<'png' | 'gif' | 'image' | 'text' | null>(null);
	let actionProgress = $state(0);
	let statusMessage = $state('');
	let wasOpen = $state(false);
	let previewGeneration = 0;

	$effect(() => {
		if (isOpen && !wasOpen) {
			includeMovingAverage = initialMovingAverage;
			includeEvents = hasEvents;
			includeLogo = hasLogo;
			if (!subtitleInitialized) {
				identitySubtitle = (projectDescription || '').slice(0, 60);
				subtitleInitialized = true;
			}
		}
		wasOpen = isOpen;
	});

	function options(): ChartExportOptions {
		return {
			theme,
			format,
			includeMovingAverage: hasMovingAverage && includeMovingAverage,
			includeEvents: hasEvents && includeEvents,
			includeIdentity,
			includeTitle,
			includeValue,
			includeInsight,
			includeDetails,
			includeBranding,
			includeLogo: hasLogo && includeLogo,
			identitySubtitle: identitySubtitle.trim(),
			customText: customText.trim(),
			chartHeightPercent
		};
	}

	function applyLayoutPreset(preset: 'focus' | 'balanced' | 'minimal') {
		layoutPreset = preset;
		if (preset === 'focus') {
			includeIdentity = false;
			includeTitle = true;
			includeValue = true;
			includeInsight = false;
			includeDetails = true;
			includeBranding = true;
			chartHeightPercent = 68;
		} else if (preset === 'balanced') {
			includeIdentity = true;
			includeTitle = true;
			includeValue = true;
			includeInsight = true;
			includeDetails = true;
			includeBranding = true;
			chartHeightPercent = 58;
		} else {
			includeIdentity = false;
			includeTitle = true;
			includeValue = true;
			includeInsight = false;
			includeDetails = false;
			includeBranding = false;
			chartHeightPercent = 78;
		}
	}

	function markCustom() {
		layoutPreset = 'custom';
	}

	function blobToDataUrl(blob: Blob): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.addEventListener('load', () => {
				if (typeof reader.result === 'string') {
					resolve(reader.result);
				} else {
					reject(new Error('Preview could not be converted to a data URL.'));
				}
			}, { once: true });
			reader.addEventListener('error', () => {
				reject(reader.error ?? new Error('Preview could not be read.'));
			}, { once: true });
			reader.readAsDataURL(blob);
		});
	}

	$effect(() => {
		if (!isOpen) return;
		void theme;
		void format;
		void includeMovingAverage;
		void includeEvents;
		void includeIdentity;
		void includeTitle;
		void includeValue;
		void includeInsight;
		void includeDetails;
		void includeBranding;
		void includeLogo;
		void identitySubtitle;
		void customText;
		void chartHeightPercent;
		const generation = ++previewGeneration;
		previewing = true;
		statusMessage = '';
		const timer = window.setTimeout(async () => {
			try {
				const blob = await renderPng(options());
				const dataUrl = await blobToDataUrl(blob);
				if (generation !== previewGeneration) return;
				previewDataUrl = dataUrl;
			} catch (error) {
				if (generation === previewGeneration) {
					statusMessage = error instanceof Error ? error.message : 'Preview could not be rendered.';
				}
			} finally {
				if (generation === previewGeneration) previewing = false;
			}
		}, 120);
		return () => window.clearTimeout(timer);
	});

	$effect(() => {
		if (!isOpen) return;
		const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		void tick().then(() => modalRef?.focus());
		return () => {
			document.body.style.overflow = previousOverflow;
			previouslyFocused?.focus();
		};
	});

	onDestroy(() => {
		previewGeneration++;
	});

	function handleModalKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			onClose?.();
			return;
		}
		if (event.key !== 'Tab' || !modalRef) return;
		const focusable = Array.from(modalRef.querySelectorAll<HTMLElement>(
			'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
		));
		if (!focusable.length) return;
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}

	function downloadBlob(blob: Blob, extension: 'png' | 'gif') {
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `${filename}.${extension}`;
		document.body.appendChild(link);
		link.click();
		window.setTimeout(() => {
			link.remove();
			URL.revokeObjectURL(url);
		}, 1_000);
	}

	async function downloadPng() {
		action = 'png';
		statusMessage = '';
		try {
			downloadBlob(await renderPng(options()), 'png');
			statusMessage = 'PNG downloaded.';
		} catch (error) {
			statusMessage = error instanceof Error ? error.message : 'PNG export failed.';
		} finally {
			action = null;
		}
	}

	async function downloadGif() {
		action = 'gif';
		actionProgress = 0;
		statusMessage = 'Rendering animation…';
		try {
			const blob = await renderGif(options(), (progress: number) => {
				actionProgress = progress;
				statusMessage = `Rendering animation… ${Math.round(progress * 100)}%`;
			});
			downloadBlob(blob, 'gif');
			statusMessage = 'Animated GIF downloaded. It plays once and holds on the final chart.';
		} catch (error) {
			statusMessage = error instanceof Error ? error.message : 'GIF export failed.';
		} finally {
			action = null;
			actionProgress = 0;
		}
	}

	async function copyImage() {
		action = 'image';
		statusMessage = '';
		try {
			if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
				throw new Error('Image clipboard is not supported by this browser.');
			}
			const blob = await renderPng(options());
			await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
			statusMessage = 'Image copied to clipboard.';
		} catch (error) {
			statusMessage = error instanceof Error ? error.message : 'Image could not be copied.';
		} finally {
			action = null;
		}
	}

	async function copyText() {
		action = 'text';
		statusMessage = '';
		try {
			await navigator.clipboard.writeText(buildChartShareText({
				projectName,
				insight: customText.trim() || insight,
				heading,
				timeframe,
				shareUrl
			}));
			statusMessage = 'Post text copied to clipboard.';
		} catch (error) {
			statusMessage = error instanceof Error ? error.message : 'Post text could not be copied.';
		} finally {
			action = null;
		}
	}
</script>

{#if isOpen}
	<div class="modal-backdrop" onclick={(event) => { if (event.target === event.currentTarget) onClose?.(); }} onkeydown={handleModalKeydown} role="presentation">
		<div bind:this={modalRef} class="modal-card" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="chart-share-title" aria-describedby="chart-share-description">
			<header class="modal-header">
				<div>
					<p class="eyebrow">Social export</p>
					<h2 id="chart-share-title"><Icon name="sparkle" /> Share chart</h2>
				</div>
				<button type="button" class="close-btn" onclick={onClose} aria-label="Close share chart"><Icon name="x" /></button>
			</header>

			<div class="modal-body">
				<p id="chart-share-description" class="text-muted">Create a fixed-size, branded image or a GIF whose graph draws itself once.</p>

				<div class="workspace">
					<div class="controls">
						<label>
							<span>Format</span>
							<select bind:value={format}>
								<option value="wide">{CHART_EXPORT_FORMATS.wide.label} · {CHART_EXPORT_FORMATS.wide.description}</option>
								<option value="square">{CHART_EXPORT_FORMATS.square.label} · {CHART_EXPORT_FORMATS.square.description}</option>
								<option value="portrait">{CHART_EXPORT_FORMATS.portrait.label} · {CHART_EXPORT_FORMATS.portrait.description}</option>
								<option value="original">Original chart ratio</option>
							</select>
						</label>

						<fieldset>
							<legend>Theme</legend>
							<div class="segmented">
								<button type="button" class:active={theme === 'current'} onclick={() => theme = 'current'}>Current</button>
								<button type="button" class:active={theme === 'light'} onclick={() => theme = 'light'}><Icon name="sun" /> Light</button>
								<button type="button" class:active={theme === 'dark'} onclick={() => theme = 'dark'}><Icon name="moon" /> Dark</button>
							</div>
						</fieldset>

						<fieldset>
							<legend>Layout</legend>
							<div class="preset-grid">
								<button type="button" class:active={layoutPreset === 'focus'} onclick={() => applyLayoutPreset('focus')}><strong>Graph focus</strong><small>Largest useful plot</small></button>
								<button type="button" class:active={layoutPreset === 'balanced'} onclick={() => applyLayoutPreset('balanced')}><strong>Balanced</strong><small>More context</small></button>
								<button type="button" class:active={layoutPreset === 'minimal'} onclick={() => applyLayoutPreset('minimal')}><strong>Minimal</strong><small>Chart first</small></button>
							</div>
						</fieldset>

						<label class="range-control">
							<span>Graph height <span class="control-value" aria-hidden="true">{chartHeightPercent}%</span></span>
							<input
								type="range"
								min="45"
								max="82"
								step="1"
								bind:value={chartHeightPercent}
								oninput={markCustom}
								aria-label="Graph height"
							/>
							<small>Maximum target; visible text always keeps enough room.</small>
						</label>

						<fieldset>
							<legend>Image content</legend>
							<div class="toggle-list">
								<label class="toggle-row"><input type="checkbox" bind:checked={includeIdentity} onchange={markCustom} /><span><strong>Project header</strong><small>Name and analytics label</small></span></label>
								<label class="toggle-row"><input type="checkbox" bind:checked={includeTitle} onchange={markCustom} /><span><strong>Chart title</strong><small>Metric name above the graph</small></span></label>
								<label class="toggle-row"><input type="checkbox" bind:checked={includeValue} onchange={markCustom} /><span><strong>Headline value</strong><small>Current value and change</small></span></label>
								<label class="toggle-row"><input type="checkbox" bind:checked={includeInsight} onchange={markCustom} /><span><strong>Insight</strong><small>Automatically generated takeaway</small></span></label>
								<label class="toggle-row"><input type="checkbox" bind:checked={includeDetails} onchange={markCustom} /><span><strong>Data details</strong><small>Timeframe, date and average label</small></span></label>
								{#if hasLogo}
									<label class="toggle-row" class:disabled={!includeIdentity}><input type="checkbox" bind:checked={includeLogo} disabled={!includeIdentity} onchange={markCustom} /><span><strong>Project logo</strong><small>Show next to the project header</small></span></label>
								{/if}
								<label class="toggle-row"><input type="checkbox" bind:checked={includeBranding} onchange={markCustom} /><span><strong>KoalaData footer</strong><small>Add source URL and privacy-first mark</small></span></label>
							</div>
						</fieldset>

						<label class="custom-copy" class:disabled={!includeIdentity}>
							<span>Project subtitle <span class="control-value" aria-hidden="true">{identitySubtitle.length}/60</span></span>
							<input
								type="text"
								maxlength="60"
								placeholder="Watch together, anywhere"
								bind:value={identitySubtitle}
								disabled={!includeIdentity}
								oninput={markCustom}
							/>
							<small>Shown below the project name. Best kept to 3–5 words.</small>
						</label>

						<label class="custom-copy">
							<span>Custom caption <span class="control-value" aria-hidden="true">{customText.length}/140</span></span>
							<textarea
								rows="3"
								maxlength="140"
								placeholder="Add context, a milestone or a question…"
								bind:value={customText}
								oninput={markCustom}
							></textarea>
							<small>Appears inside the image and replaces the generated insight in copied post text.</small>
						</label>

						<fieldset>
							<legend>Chart overlays</legend>
						<div class="toggle-list">
							{#if hasMovingAverage}
								<label class="toggle-row"><input type="checkbox" bind:checked={includeMovingAverage} /><span><strong>7-day average</strong><small>Emphasize the smoothed trend</small></span></label>
							{/if}
							{#if hasEvents}
								<label class="toggle-row"><input type="checkbox" bind:checked={includeEvents} /><span><strong>Events and releases</strong><small>Include selected timeline markers</small></span></label>
							{/if}
						</div>
						</fieldset>
					</div>

					<div class="preview-panel">
						<div class="preview-frame" class:portrait={format === 'portrait'} class:square={format === 'square'}>
							{#if previewDataUrl}
								<img src={previewDataUrl} alt={`Preview of ${heading || 'chart'} social export`} />
							{/if}
							{#if previewing}<div class="preview-loading" role="status">Rendering preview…</div>{/if}
						</div>
						<div class="share-copy">
							<span>Suggested post</span>
							<p>{buildChartShareText({ projectName, insight: customText.trim() || insight, heading, timeframe, shareUrl })}</p>
						</div>
					</div>
				</div>
			</div>

			<footer class="modal-footer">
				<div class="status" role="status">
					{statusMessage}
					{#if action === 'gif'}<progress value={actionProgress} max="1" aria-label="GIF rendering progress"></progress>{/if}
				</div>
				<div class="footer-actions">
					<button type="button" class="btn btn-secondary" onclick={copyText} disabled={action !== null}><Icon name="clipboard-text" /> Copy text</button>
					<button type="button" class="btn btn-secondary" onclick={copyImage} disabled={action !== null}><Icon name="clipboard-text" /> Copy image</button>
					<button type="button" class="btn btn-secondary" onclick={downloadGif} disabled={action !== null}><Icon name="chart-line-up" /> {action === 'gif' ? 'Rendering…' : 'Animated GIF'}</button>
					<button type="button" class="btn btn-primary" onclick={downloadPng} disabled={action !== null}><Icon name="cloud-arrow-up" /> {action === 'png' ? 'Exporting…' : 'Download PNG'}</button>
				</div>
			</footer>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 1100;
		display: grid;
		place-items: center;
		padding: 1rem;
		background: rgba(3, 8, 5, 0.76);
		backdrop-filter: blur(8px);
	}
	.modal-card {
		width: min(1180px, 100%);
		max-height: calc(100vh - 2rem);
		overflow: auto;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		background: var(--bg-surface);
		box-shadow: 0 30px 80px rgba(0, 0, 0, 0.38);
	}
	.modal-header {
		position: sticky;
		top: 0;
		z-index: 2;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--border-color);
		background: color-mix(in srgb, var(--bg-surface) 94%, transparent);
		backdrop-filter: blur(10px);
	}
	.eyebrow { margin: 0 0 0.2rem; color: var(--primary); font-size: 0.66rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
	h2 { display: flex; align-items: center; gap: 0.5rem; margin: 0; font-size: 1.25rem; }
	.close-btn { display: grid; place-items: center; width: 40px; height: 40px; border: 1px solid var(--border-color); border-radius: 999px; background: var(--bg-inset); color: var(--text-muted); cursor: pointer; }
	.close-btn:hover { color: var(--text-base); border-color: var(--primary); }
	.modal-body { display: grid; gap: 1rem; padding: 1.25rem; }
	.modal-body > p { margin: 0; }
	.workspace { display: grid; grid-template-columns: minmax(230px, 0.7fr) minmax(0, 1.7fr); gap: 1.25rem; align-items: start; }
	.controls { display: grid; gap: 1rem; max-height: 62vh; overflow-y: auto; padding: 1rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--bg-inset); }
	.controls > label, fieldset { display: grid; gap: 0.45rem; }
	.controls label > span, legend { color: var(--text-muted); font-size: 0.72rem; font-weight: 750; letter-spacing: 0.04em; text-transform: uppercase; }
	select, textarea, input[type="text"] { width: 100%; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.5rem 0.65rem; background: var(--bg-surface); color: var(--text-base); font: inherit; font-size: 0.82rem; }
	select { min-height: 42px; }
	input[type="text"] { min-height: 42px; }
	textarea { min-height: 72px; resize: vertical; line-height: 1.45; }
	fieldset { min-width: 0; margin: 0; padding: 0; border: 0; }
	.segmented { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.3rem; }
	.segmented button { display: flex; justify-content: center; align-items: center; gap: 0.3rem; min-height: 38px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: var(--bg-surface); color: var(--text-muted); font: inherit; font-size: 0.75rem; font-weight: 700; cursor: pointer; }
	.segmented button.active { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 12%, var(--bg-surface)); color: var(--primary); }
	.preset-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.3rem; }
	.preset-grid button { display: grid; gap: 0.12rem; min-height: 54px; padding: 0.45rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: var(--bg-surface); color: var(--text-muted); font: inherit; cursor: pointer; }
	.preset-grid button.active { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 12%, var(--bg-surface)); color: var(--primary); }
	.preset-grid strong { font-size: 0.72rem; }
	.preset-grid small { font-size: 0.62rem; line-height: 1.25; }
	.range-control > span, .custom-copy > span { display: flex; justify-content: space-between; gap: 0.5rem; }
	.control-value { color: var(--primary); font: inherit; }
	.range-control input { width: 100%; accent-color: var(--primary); }
	.range-control small, .custom-copy small { color: var(--text-muted); font-size: 0.68rem; font-weight: 500; line-height: 1.35; }
	.custom-copy.disabled { opacity: 0.52; }
	.toggle-list { display: grid; gap: 0.25rem; }
	.toggle-row { display: grid !important; grid-template-columns: auto 1fr; gap: 0.65rem !important; align-items: start; padding: 0.55rem; border-radius: var(--radius-sm); cursor: pointer; }
	.toggle-row:hover { background: var(--bg-surface); }
	.toggle-row.disabled { opacity: 0.52; cursor: not-allowed; }
	.toggle-row input { width: 17px; height: 17px; margin-top: 0.12rem; accent-color: var(--primary); }
	.toggle-row span { display: grid; gap: 0.15rem; color: var(--text-base) !important; font-size: 0.78rem !important; letter-spacing: 0 !important; text-transform: none !important; }
	.toggle-row small { color: var(--text-muted); font-size: 0.68rem; font-weight: 500; line-height: 1.35; }
	.preview-panel { position: sticky; top: 82px; min-width: 0; display: grid; gap: 0.75rem; }
	.preview-frame { position: relative; display: grid; place-items: center; min-height: 280px; overflow: hidden; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: #080d09; }
	.preview-frame img { display: block; width: 100%; height: auto; max-height: 58vh; object-fit: contain; }
	.preview-frame.square img, .preview-frame.portrait img { width: auto; max-width: 100%; }
	.preview-loading { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(8, 13, 9, 0.66); color: #fff; font-size: 0.82rem; font-weight: 700; }
	.share-copy { display: grid; gap: 0.35rem; padding: 0.8rem 0.9rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: var(--bg-inset); }
	.share-copy span { color: var(--text-muted); font-size: 0.68rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
	.share-copy p { margin: 0; white-space: pre-line; font-size: 0.78rem; line-height: 1.5; }
	.modal-footer { position: sticky; bottom: 0; z-index: 2; display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 0.9rem 1.25rem; border-top: 1px solid var(--border-color); background: color-mix(in srgb, var(--bg-surface) 94%, transparent); backdrop-filter: blur(10px); }
	.status { min-height: 1.2rem; color: var(--text-muted); font-size: 0.72rem; }
	.status progress { display: block; width: 180px; height: 5px; margin-top: 0.3rem; accent-color: var(--primary); }
	.footer-actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 0.5rem; }
	.footer-actions .btn { min-height: 40px; }

	@media (max-width: 820px) {
		.modal-backdrop { padding: 0; }
		.modal-card { max-height: 100vh; min-height: 100vh; border-radius: 0; }
		.workspace { grid-template-columns: 1fr; }
		.preview-panel { position: static; grid-row: 1; }
		.preview-frame { min-height: 210px; }
		.modal-footer { align-items: stretch; flex-direction: column; }
		.footer-actions { display: grid; grid-template-columns: repeat(2, 1fr); }
	}

	@media (max-width: 480px) {
		.modal-body, .modal-header, .modal-footer { padding-inline: 0.8rem; }
		.footer-actions { grid-template-columns: 1fr; }
	}
</style>
