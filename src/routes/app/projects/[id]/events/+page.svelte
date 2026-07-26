<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { enhance } from '$app/forms';
	import type { ProjectEventCategory } from '$lib/server/project-events';

	let { data, form } = $props();

	let events = $derived(data.events);
	let suggestions = $derived(data.suggestions);

	// Form state
	let editingId = $state<string | null>(null);
	let date = $state(new Date().toISOString().split('T')[0]);
	let title = $state('');
	let description = $state('');
	let category = $state<ProjectEventCategory>('badge');
	let icon = $state('🏅');
	let isPublished = $state(true);

	const categoryIcons: Record<ProjectEventCategory, string> = {
		badge: '🏅',
		release: '🚀',
		marketing: '📢',
		incident: '⚠️',
		custom: '📌'
	};

	function handleCategoryChange(newCategory: ProjectEventCategory) {
		category = newCategory;
		icon = categoryIcons[newCategory] || '📌';
	}

	function startEdit(event: typeof events[0]) {
		editingId = event.id;
		date = event.date;
		title = event.title;
		description = event.description || '';
		category = event.category;
		icon = event.icon || categoryIcons[event.category] || '📌';
		isPublished = event.isPublished;
	}

	function resetForm() {
		editingId = null;
		date = new Date().toISOString().split('T')[0];
		title = '';
		description = '';
		category = 'badge';
		icon = '🏅';
		isPublished = true;
	}

	function applySuggestion(suggestion: typeof suggestions[0]) {
		editingId = null;
		date = suggestion.date;
		title = suggestion.title;
		description = suggestion.description;
		category = suggestion.category;
		icon = suggestion.icon;
		isPublished = true;
	}
</script>

<div class="events-page-content flex flex-col gap-2">
	<!-- Page Header -->
	<div class="card events-header-card">
		<div class="flex justify-between align-center flex-wrap gap-2">
			<div>
				<h2 class="flex align-center gap-1"><Icon name="flag" /> Events & Milestones</h2>
				<p class="text-muted">
					Füge deinem Projekt besondere Ereignisse (Badges, Releases, Marketing-Aktionen) hinzu.
					Diese werden auf deinen Graphen als interaktive Marker dargestellt.
				</p>
			</div>
		</div>
	</div>

	{#if form?.error}
		<div class="alert alert-error">
			<Icon name="warning" />
			<span>{form.error}</span>
		</div>
	{/if}

	<!-- Smart Suggestions Carousel / Section -->
	{#if suggestions.length > 0}
		<div class="card suggestions-card">
			<div class="card-header flex align-center gap-1">
				<Icon name="sparkle" />
				<h3>Vorgeschlagene Meilensteine</h3>
				<span class="badge badge-sm">{suggestions.length} erkannt</span>
			</div>
			<p class="text-muted text-sm">
				Basierend auf deinen Daten und Store-Updates wurden folgende potenzielle Events erkannt. Du entscheidest, was auf deiner Timeline erscheint!
			</p>
			<hr class="divider" />
			
			<div class="suggestions-grid">
				{#each suggestions as sug}
					<div class="suggestion-item card">
						<div class="flex align-center justify-between gap-1 mb-1">
							<span class="suggestion-icon">{sug.icon}</span>
							<span class="badge badge-sm text-xs">{sug.date}</span>
						</div>
						<h4 class="suggestion-title">{sug.title}</h4>
						<p class="suggestion-desc text-muted text-xs">{sug.description}</p>
						<button 
							type="button" 
							class="btn btn-secondary btn-sm mt-1 flex align-center justify-center gap-1"
							onclick={() => applySuggestion(sug)}
						>
							<Icon name="plus" /> Zu Formular übernehmen
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<div class="grid grid-2">
		<!-- Add / Edit Form -->
		<div class="card form-card">
			<div class="flex justify-between align-center">
				<h3>{editingId ? 'Event bearbeiten' : 'Neues Event erstellen'}</h3>
				{#if editingId}
					<button type="button" class="btn btn-tertiary btn-sm" onclick={resetForm}>Abbrechen</button>
				{/if}
			</div>
			<hr class="divider" />

			<form 
				method="POST" 
				action={editingId ? '?/update' : '?/create'} 
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success') resetForm();
						await update();
					};
				}} 
				class="flex flex-col gap-1.5"
			>
				{#if editingId}
					<input type="hidden" name="id" value={editingId} />
				{/if}

				<div class="form-group">
					<label for="event-date">Datum *</label>
					<input type="date" id="event-date" name="date" bind:value={date} required class="input" />
				</div>

				<div class="form-group">
					<label for="event-title">Titel / Name *</label>
					<input 
						type="text" 
						id="event-title" 
						name="title" 
						bind:value={title} 
						placeholder="z. B. Featured Badge erhalten" 
						required 
						class="input" 
					/>
				</div>

				<div class="grid grid-2-sm gap-1">
					<div class="form-group">
						<label for="event-category">Kategorie</label>
						<select 
							id="event-category" 
							name="category" 
							bind:value={category} 
							onchange={(e) => handleCategoryChange(e.currentTarget.value as ProjectEventCategory)}
							class="input"
						>
							<option value="badge">🏅 Badge / Auszeichnung</option>
							<option value="release">🚀 Release / Update</option>
							<option value="marketing">📢 Marketing / Launch</option>
							<option value="incident">⚠️ Incident / Ausfall</option>
							<option value="custom">📌 Benutzerdefiniert</option>
						</select>
					</div>

					<div class="form-group">
						<label for="event-icon">Icon / Emoji</label>
						<input type="text" id="event-icon" name="icon" bind:value={icon} class="input" maxLength={4} />
					</div>
				</div>

				<div class="form-group">
					<label for="event-description">Beschreibung (optional)</label>
					<textarea 
						id="event-description" 
						name="description" 
						bind:value={description} 
						rows="2" 
						placeholder="Details zum Event..." 
						class="input"
					></textarea>
				</div>

				<div class="form-group flex align-center gap-1">
					<input type="hidden" name="isPublishedPresent" value="true" />
					<input type="checkbox" id="event-published" name="isPublished" value="true" bind:checked={isPublished} />
					<label for="event-published" class="mb-0 cursor-pointer">
						Auf Graphen & öffentlicher Seite anzeigen (Veröffentlicht)
					</label>
				</div>

				<div class="flex justify-end gap-1 mt-1">
					<button type="submit" class="btn btn-primary">
						<Icon name={editingId ? 'pencil' : 'plus'} /> {editingId ? 'Event aktualisieren' : 'Event speichern'}
					</button>
				</div>
			</form>
		</div>

		<!-- Events List -->
		<div class="card list-card">
			<h3>Erstellte Events ({events.length})</h3>
			<hr class="divider" />

			{#if events.length === 0}
				<div class="text-center py-4 text-muted">
					<p>Noch keine Events erstellt.</p>
					<p class="text-xs">Verwende das Formular oder übernimm Vorschläge, um Events hinzuzufügen.</p>
				</div>
			{:else}
				<div class="events-list flex flex-col gap-1">
					{#each events as event}
						<div class="event-item card-sm flex align-center justify-between gap-1 {editingId === event.id ? 'active-editing' : ''}">
							<div class="flex align-center gap-1.5 flex-1 min-w-0">
								<span class="event-badge-icon">{event.icon || categoryIcons[event.category] || '📌'}</span>
								<div class="flex flex-col min-w-0">
									<div class="flex align-center gap-1 flex-wrap">
										<strong class="event-item-title text-truncate">{event.title}</strong>
										{#if !event.isPublished}
											<span class="badge badge-sm badge-draft">Entwurf</span>
										{/if}
										{#if event.impact}
											{#if event.impact.status === 'calculated'}
												<button 
													type="button"
													class="badge badge-sm btn-unstyled {event.impact.percentChange !== null && event.impact.percentChange >= 0 ? 'badge-impact-positive' : 'badge-impact-negative'}"
													title={`7-Tage Vorher (${event.impact.preAvg}/d) vs. Nachher (${event.impact.postAvg}/d) · Netto: ${event.impact.netChange >= 0 ? '+' : ''}${event.impact.netChange}`}
													aria-label={`7-Tage Impact: ${event.impact.summaryText}`}
												>
													{event.impact.percentChange !== null && event.impact.percentChange >= 0 ? '📈' : '📉'} {event.impact.summaryText}
												</button>
											{:else}
												<button 
													type="button"
													class="badge badge-sm btn-unstyled badge-impact-pending" 
													title="Benötigt Daten vor und nach dem Event für die Auswertung"
													aria-label="Impact Auswertung ausstehend"
												>
													⏳ Auswertung ausstehend
												</button>
											{/if}
										{/if}
									</div>
									<span class="text-muted text-xs">{event.date} · {event.category}</span>
									{#if event.description}
										<p class="text-muted text-xs text-truncate">{event.description}</p>
									{/if}
								</div>
							</div>

							<div class="event-actions flex align-center gap-0.5">
								<!-- Quick Toggle Publish Form -->
								<form method="POST" action="?/update" use:enhance>
									<input type="hidden" name="id" value={event.id} />
									<input type="hidden" name="isPublished" value={event.isPublished ? 'false' : 'true'} />
									<button 
										type="submit" 
										class="btn btn-tertiary btn-icon btn-sm" 
										title={event.isPublished ? 'Auf Entwurf setzen' : 'Veröffentlichen'}
										aria-label={event.isPublished ? 'Auf Entwurf setzen' : 'Veröffentlichen'}
									>
										<Icon name={event.isPublished ? 'eye' : 'eye-slash'} />
									</button>
								</form>

								<button 
									type="button" 
									class="btn btn-tertiary btn-icon btn-sm" 
									title="Bearbeiten"
									aria-label="Event bearbeiten"
									onclick={() => startEdit(event)}
								>
									<Icon name="pencil" />
								</button>

								<form method="POST" action="?/delete" use:enhance>
									<input type="hidden" name="id" value={event.id} />
									<button 
										type="submit" 
										class="btn btn-tertiary btn-icon btn-sm text-danger" 
										title="Löschen"
										aria-label="Event löschen"
										onclick={(e) => { if (!confirm('Event wirklich löschen?')) e.preventDefault(); }}
									>
										<Icon name="trash" />
									</button>
								</form>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.suggestions-card {
		background: linear-gradient(135deg, rgba(47, 109, 71, 0.05) 0%, rgba(120, 211, 151, 0.08) 100%);
		border: 1px solid rgba(120, 211, 151, 0.25);
	}
	.suggestions-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 0.75rem;
		margin-top: 0.75rem;
	}
	.suggestion-item {
		padding: 0.75rem;
		background: var(--card-bg, #ffffff);
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}
	.suggestion-icon {
		font-size: 1.4rem;
	}
	.suggestion-title {
		font-size: 0.9rem;
		font-weight: 600;
		margin: 0.25rem 0;
	}
	.event-badge-icon {
		font-size: 1.4rem;
		line-height: 1;
	}
	.active-editing {
		outline: 2px solid var(--primary-color, #2f6d47);
	}
	.badge-draft {
		background: rgba(148, 163, 184, 0.15);
		color: #64748b;
	}
	.cursor-pointer {
		cursor: pointer;
	}
	.grid-2-sm {
		display: grid;
		grid-template-columns: 1fr 1fr;
	}
	@media (max-width: 600px) {
		.grid-2-sm {
			grid-template-columns: 1fr;
		}
	}
	.badge-impact-positive {
		background: rgba(34, 197, 94, 0.15);
		color: #15803d;
		border: 1px solid rgba(34, 197, 94, 0.35);
	}
	:global(.dark) .badge-impact-positive {
		background: rgba(74, 222, 128, 0.15);
		color: #4ade80;
		border-color: rgba(74, 222, 128, 0.35);
	}
	.badge-impact-negative {
		background: rgba(239, 68, 68, 0.15);
		color: #b91c1c;
		border: 1px solid rgba(239, 68, 68, 0.35);
	}
	:global(.dark) .badge-impact-negative {
		background: rgba(248, 113, 113, 0.15);
		color: #f87171;
		border-color: rgba(248, 113, 113, 0.35);
	}
	.badge-impact-pending {
		background: rgba(148, 163, 184, 0.12);
		color: var(--text-muted);
		border: 1px dashed var(--border-color);
	}
	.btn-unstyled {
		font: inherit;
		cursor: pointer;
		background: none;
		border: none;
		padding: 0;
		text-align: inherit;
	}
</style>
