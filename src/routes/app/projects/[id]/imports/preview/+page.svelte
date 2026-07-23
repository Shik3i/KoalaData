<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';

	let { data, form } = $props();

	let loading = $state(false);
	const expiresAtLabel = $derived(new Date(data.draft.expiresAt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

	const initialMapping = untrack(() => {
		let detectedDateColumn = '';
		const mappings = data.previewHeaders.map((header, idx) => {
			const auto = data.autoDetect.mappings;
			
			// Check if this header matches an auto-detected metric type
			let isMapped = false;
			let metricType = 'custom';
				let aggregation = data.report?.semantics === 'snapshot' ? 'latest' : 'sum';
			let isCumulative = false;

			// Date auto-detect
			if (auto['date']?.column === header) {
				detectedDateColumn = header;
			}

			// Metric auto-detect
			for (const [key, mapVal] of Object.entries(auto)) {
				if (key !== 'date' && mapVal.column === header) {
					isMapped = true;
					metricType = mapVal.metricType;
					if (metricType === 'active_users') {
						aggregation = 'latest';
						isCumulative = false;
					}
					break;
				}
			}

			return {
				index: idx,
				header,
				isMapped,
				metricType,
				displayName: header,
				aggregation,
				isCumulative
			};
		});
		return { mappings, dateColumn: detectedDateColumn || data.previewHeaders[0] || '' };
	});

	let dateColumn = $state(initialMapping.dateColumn);
	let dateFormat = $state('YYYY-MM-DD');
	let mappings = $state(initialMapping.mappings);
</script>

<svelte:head>
	<title>Map CSV Columns - KoalaData</title>
</svelte:head>

<div class="container preview-page">
	<a href="/app/projects/{data.project.id}/imports" class="back-link">← Cancel and Back to History</a>
	
	<h1 class="page-title">Map CSV Columns</h1>
	<p class="text-muted">Map your spreadsheet headers to standard extension metrics or define custom charts.</p>

	{#if form?.error}
		<div class="alert alert-danger" role="alert">
			{form.error}
		</div>
	{/if}

	<section class="card file-summary" aria-label="Upload summary">
		<div><span>File</span><strong>{data.originalFilename}</strong></div>
		<div><span>Rows</span><strong>{data.draft.rowCount}</strong></div>
		<div><span>Encoding</span><strong>{data.parser.encoding}</strong></div>
		<div><span>Delimiter</span><strong>{data.parser.delimiter}</strong></div>
		<div><span>Review expires</span><strong>{expiresAtLabel}</strong></div>
	</section>

	{#if data.parser.inconsistentRowCount > 0}
		<div class="alert alert-warning" role="status">
			<Icon name="warning" /> {data.parser.inconsistentRowCount} rows have a different number of columns and may be skipped.
		</div>
	{/if}

	{#if data.autoDetect.confidence === 'high' || data.report}
		<div class="alert alert-success" role="status">
			<Icon name="sparkle" /> <strong>Chrome Web Store format detected.</strong>
			{#if data.report}
				{data.report.title} uses <strong>{data.report.semantics === 'snapshot' ? 'latest-value snapshot' : 'period-total flow'}</strong> semantics.
			{:else}
				Date and standard metric columns were preconfigured.
			{/if}
			Review the sample and confirm below.
		</div>
	{:else}
		<div class="alert alert-info" role="status">
			No known report name was detected. Nothing will be imported until you explicitly select and configure metric columns.
		</div>
	{/if}

	<!-- 5 Row CSV Sample Preview Card -->
	<section class="card table-card preview-table-card">
		<h3>CSV Row Preview (First 5 Rows)</h3>
		<div class="table-wrapper">
			<table>
				<thead>
					<tr>
						{#each data.previewHeaders as header}
							<th>{header}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each data.previewRows as row}
						<tr>
							{#each row as cell}
								<td>{cell}</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<!-- Mapping Form -->
	<form 
		method="POST" 
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				try {
					await update();
				} finally {
					loading = false;
				}
			};
		}}
		class="mapping-form"
	>
		<input type="hidden" name="draftId" value={data.draft.id} />

		<div class="grid grid-3 select-section">
			<!-- Date Column Settings -->
			<div class="card settings-card col-span-3">
				<h2>1. Date Mapping</h2>
				<p class="text-muted">Select the column containing the observation dates and specify its formatting.</p>
				<hr class="divider" />
				<div class="grid grid-2">
					<div class="form-group">
						<label for="dateColumn">Date Column Header</label>
						<select id="dateColumn" name="dateColumn" bind:value={dateColumn} required disabled={loading}>
							{#each data.previewHeaders as h}
								<option value={h}>{h}</option>
							{/each}
						</select>
					</div>

					<div class="form-group">
						<label for="dateFormat">Date Format in File</label>
						<select id="dateFormat" name="dateFormat" bind:value={dateFormat} required disabled={loading}>
							<option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-07-18)</option>
							<option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 07/18/2026)</option>
							<option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 18/07/2026)</option>
						</select>
					</div>
				</div>
			</div>
		</div>

		<!-- Metrics Columns Settings -->
		<div class="card settings-card col-span-3" style="margin-top: 1.5rem;">
			<h2>2. Metrics Mapping</h2>
			<p class="text-muted">Check each column that you want to import, choose its metric type, and customize its configuration.</p>
			<hr class="divider" />

			<div class="mappings-container">
				{#each mappings as map (map.index)}
					<!-- Skip rendering mapping controls for the date column to prevent error -->
					{#if map.header !== dateColumn}
						<div class="mapping-row flex align-center justify-between gap-2 flex-wrap">
							<div class="flex align-center gap-1 col-header-box">
								<input 
									type="checkbox" 
									id="map_col_{map.index}" 
									name="map_col_{map.index}" 
									value="true" 
									bind:checked={map.isMapped}
									disabled={loading}
								/>
								<label for="map_col_{map.index}"><strong>{map.header}</strong></label>
							</div>

							{#if map.isMapped}
								<div class="flex gap-2 flex-1 fields-box flex-wrap">
									<div class="form-group inline-group">
										<label for="type_col_{map.index}">Metric Type</label>
										<select 
											id="type_col_{map.index}" 
											name="type_col_{map.index}" 
											bind:value={map.metricType}
											disabled={loading}
										>
											<option value="active_users">Weekly Users (installed-user snapshot)</option>
											<option value="installs">Daily Installs</option>
											<option value="uninstalls">Daily Uninstalls</option>
											<option value="store_page_views">Store Page Views</option>
											<option value="store_impressions">Store Impressions</option>
											<option value="custom">Custom / Other Metric</option>
										</select>
									</div>

									<div class="form-group inline-group">
										<label for="name_col_{map.index}">Metric Display Name</label>
										<input 
											type="text" 
											id="name_col_{map.index}" 
											name="name_col_{map.index}" 
											bind:value={map.displayName} 
											required
											disabled={loading}
										/>
									</div>

									<div class="form-group inline-group">
										<label for="agg_col_{map.index}">Aggregation</label>
										<select 
											id="agg_col_{map.index}" 
											name="agg_col_{map.index}" 
											bind:value={map.aggregation}
											disabled={loading}
										>
											<option value="sum">Sum (Totals)</option>
											<option value="latest">Latest value (Snapshot)</option>
											<option value="average">Average</option>
											<option value="maximum">Maximum</option>
											<option value="minimum">Minimum</option>
										</select>
										<small>{map.aggregation === 'latest' ? 'Use for installed-user and state snapshots.' : map.aggregation === 'sum' ? 'Use for installs, uninstalls and other daily flows.' : 'Advanced aggregation for custom data.'}</small>
									</div>

									<div class="form-group inline-group flex align-center gap-0.5 checkbox-field">
										<input 
											type="checkbox" 
											id="cum_col_{map.index}" 
											name="cum_col_{map.index}" 
											value="true" 
											bind:checked={map.isCumulative}
											disabled={loading}
										/>
										<label for="cum_col_{map.index}" style="margin-bottom: 0;">Cumulative</label>
									</div>
								</div>
							{/if}
						</div>
					{/if}
				{/each}
			</div>
		</div>

		<button type="submit" class="btn btn-primary btn-full confirm-btn" disabled={loading}>
			{loading ? 'Processing Import...' : 'Confirm and Import Observations'}
		</button>
	</form>
</div>

<style>
	.col-span-3 {
		grid-column: span 3;
	}

	.back-link {
		font-weight: 600;
		font-size: 0.9rem;
		display: inline-block;
		margin-bottom: 1rem;
	}

	.page-title {
		margin-bottom: 0.25rem;
	}

	.divider {
		border: 0;
		border-top: 1px solid var(--border-color);
		margin: 1rem 0;
	}

	.preview-table-card {
		padding: 1rem;
		margin-top: 1.5rem;
	}
	.preview-table-card h3 {
		font-size: 1.05rem;
		margin-bottom: 0.75rem;
	}

	.table-wrapper {
		overflow-x: auto;
	}

	table {
		margin-bottom: 0;
		font-size: 0.85rem;
	}

	th, td {
		padding: 0.5rem 0.75rem;
		white-space: nowrap;
	}

	.mapping-row {
		padding: 1rem;
		border-bottom: 1px solid var(--border-color);
	}
	.mapping-row:last-child {
		border-bottom: 0;
	}

	.col-header-box {
		width: 200px;
	}
	.col-header-box input[type="checkbox"] {
		width: auto;
		margin-bottom: 0;
	}
	.col-header-box label {
		margin-bottom: 0;
		cursor: pointer;
	}

	.fields-box {
		display: flex;
		align-items: flex-end;
		gap: 1rem;
	}

	.inline-group {
		margin-bottom: 0;
		flex: 1;
		min-width: 130px;
	}
	.inline-group label {
		font-size: 0.75rem;
		margin-bottom: 0.25rem;
	}
	.inline-group input, .inline-group select {
		margin-bottom: 0;
		padding: 0.4rem 0.6rem;
		font-size: 0.85rem;
	}

	.checkbox-field {
		min-width: auto;
		height: 38px;
		display: flex;
		align-items: center;
	}
	.checkbox-field input {
		width: auto;
		margin-bottom: 0;
	}

	.confirm-btn {
		width: 100%;
		margin-top: 2rem;
		padding: 0.8rem;
		font-size: 1.05rem;
	}

	.file-summary {
		display: grid;
		grid-template-columns: minmax(12rem, 2fr) repeat(4, minmax(6rem, 1fr));
		gap: 1rem;
		margin: 1.25rem 0;
		padding: 1rem 1.25rem;
	}
	.file-summary div { min-width: 0; }
	.file-summary span { display: block; margin-bottom: 0.2rem; color: var(--text-muted); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; }
	.file-summary strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.88rem; }
	.inline-group small { display: block; max-width: 15rem; margin-top: 0.25rem; color: var(--text-muted); font-size: 0.7rem; line-height: 1.35; }

	@media (max-width: 800px) {
		.file-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
		.file-summary div:first-child { grid-column: 1 / -1; }
	}
</style>
