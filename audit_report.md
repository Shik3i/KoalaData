# Technischer Audit-Bericht: KoalaData

Dieses Dokument enthält das vollständige und tiefgehende technische Audit der KoalaData-Codebasis. Die Codebasis wurde auf Performance-Flaschenhälse, Race Conditions, Integrationsdefekte, Security-Schwachstellen, Input-Validierungs-Schwächen und UI/UX/QoL-Mängel untersucht.

---

## Zusammenfassung der wichtigsten Erkenntnisse

| ID | Kategorie | Fundstelle / Kontext | Schweregrad | Status / Kurzbeschreibung |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Security** | `vite.config.ts` vs. `svelte.config.js` | **High** | **CSP ist komplett inaktiv**, da die Konfiguration im falschen File liegt. |
| **2** | **Performance** | `/` (Homepage) - `getLeaderboard()` | **High** | Homepage berechnet das Leaderboard bei jedem Besuch live ohne Caching (DoS-Gefahr). |
| **3** | **Performance** | `src/lib/server/growth.ts` (N+1 Query) | **High** | Leaderboard-Berechnung führt N\*M\*K separate CTE-Abfragen an SQLite aus. |
| **4** | **Performance** | `src/lib/server/csv/pipeline.ts` (Import-Schleife) | **High** | Overlap-Check führt pro CSV-Zeile und Metrik eine eigene DB-Abfrage aus. |
| **5** | **Race Condition** | `confirmImportDraft` (Double-Submit) | **High** | Doppelter Confirm-Klick löst unhandled `ENOENT`-Fehler und Transaction-Rauschen aus. |
| **6** | **Race Condition** | `confirmImportDraft` (Metric Definitions) | **Medium** | Erstellung von `metricDefinitions` erfolgt außerhalb der Transaktion (Dubletten-Gefahr). |
| **7** | **Ressourcen-Leak** | `rollbackBatch` (Revert-Cleanup) | **Medium** | Revertierte CSV-Dateien und Observations werden weder gelöscht noch aus dem Quota entfernt. |
| **8** | **Security** | `hooks.server.ts` (Force Password Change) | **Medium** | Passwortänderungs-Zwang wird nicht auf Route-Ebene erzwungen (nur UI-Banner). |
| **9** | **UX / QoL** | `src/app.html` & `+layout.svelte` (Theme-Flash) | **Medium** | FOUC (Flash of Light Mode) bei System-Dark-Mode wegen Namens-Mismatch ('system' vs 'auto'). |
| **10** | **Security** | `src/lib/server/auth.ts` (`passwordHash` in Locals) | **Low** | `locals.user` enthält den Passwort-Hash (Leak-Gefahr bei Logs/Serialisierung). |
| **11** | **UX / QoL** | `src/routes/p/[slug]/+page.svelte` (Buttons) | **Low** | Unchronologische Reihenfolge der Date-Filter-Buttons (`1Y` vor `90D`). |
| **12** | **UX / QoL** | `src/lib/server/growth.ts` (Growth % Logic) | **Low** | Unklare Growth%-Berechnung (wird unter 25 WAUs stumm auf 0 gesetzt). |
| **13** | **Robustheit** | `confirmImportDraft` (Falsche Spaltenanzahl) | **Low** | Fehlende Guards für Spaltengrenzen bei unvollständigen CSV-Zeilen führen zu unklaren TypeErrors. |
| **14** | **Ressourcen-Leak** | `limiter.ts` (Rate-Limit Table) | **Low** | Rate-Limit-Datenbanktabelle wächst unbegrenzt und hat keinen TTL-Cleanup. |

---

## Detaillierte Audit-Ergebnisse & Behebungsvorschläge

### 1. Security: CSP-Konfiguration ist komplett inaktiv (High)
* **Datei:** [vite.config.ts](file:///Users/koala/Documents/Workspaces/KoalaData/vite.config.ts#L8-L21)
* **Problem:** 
  Die Content Security Policy (CSP) sowie die Compiler-Optionen und Adapter-Einstellungen sind fälschlicherweise in `vite.config.ts` unter dem `sveltekit(...)` Plugin deklariert. SvelteKit ignoriert diese Konfigurationen dort vollständig. SvelteKit sucht diese Einstellungen ausschließlich in `svelte.config.js`. Dadurch läuft die gesamte Applikation in Produktion **ohne Content Security Policy** und verwendet Default-Compiler-Optionen.
* **Behebungsvorschlag:**
  Erstelle eine `svelte.config.js` im Root-Verzeichnis und verlagere die Konfiguration dorthin.
  
  **Neue Datei `svelte.config.js`:**
  ```javascript
  import adapter from '@sveltejs/adapter-node';
  import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

  /** @type {import('@sveltejs/kit').Config} */
  const config = {
      preprocess: vitePreprocess(),
      compilerOptions: {
          runes: true
      },
      kit: {
          adapter: adapter(),
          csp: {
              mode: 'nonce',
              directives: {
                  'default-src': ['self'],
                  'script-src': ['self'],
                  'style-src': ['self', 'unsafe-inline'],
                  'font-src': ['self'],
                  'img-src': ['self', 'data:'],
                  'connect-src': ['self'],
                  'frame-ancestors': ['none'],
                  'object-src': ['none'],
                  'base-uri': ['self']
              }
          }
      }
  };

  export default config;
  ```
  **Modifizierte `vite.config.ts`:**
  ```typescript
  import { defineConfig } from 'vitest/config';
  import { sveltekit } from '@sveltejs/kit/vite';

  export default defineConfig({
      plugins: [sveltekit()],
      test: {
          expect: { requireAssertions: true },
          projects: [
              {
                  extends: './vite.config.ts',
                  test: {
                      name: 'server',
                      environment: 'node',
                      include: ['src/**/*.{test,spec}.{js,ts}'],
                      exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
                  }
              }
          ]
      }
  });
  ```

---

### 2. Performance: Homepage berechnet Leaderboard live bei jedem Request (High)
* **Datei:** [+page.server.ts](file:///Users/koala/Documents/Workspaces/KoalaData/src/routes/+page.server.ts#L39)
* **Problem:** 
  Auf der öffentlichen Startseite `/` wird `getLeaderboard()` bei jedem einzelnen Request live aufgerufen. Da dieses Leaderboard teure Berechnungen über alle Projekte, Datenquellen und Metriken anstellt (inklusive komplexer CTEs), stellt dies ein massives Performance-Problem und ein einfaches Ziel für Denial-of-Service-Angriffe (DoS) dar.
* **Behebungsvorschlag:**
  Da das Leaderboard nur von importierten Daten abhängt, sollte das Ergebnis im Arbeitsspeicher gecached werden. Der Cache wird erst invalidiert, wenn ein Import erfolgreich abgeschlossen oder zurückgerollt wird.
  
  Erstelle eine Caching-Schicht in `src/lib/server/growth.ts`:
  ```typescript
  let cachedLeaderboard: ProjectLeaderboardItem[] | null = null;

  export function invalidateLeaderboardCache() {
      cachedLeaderboard = null;
  }

  export async function getLeaderboard(): Promise<ProjectLeaderboardItem[]> {
      if (cachedLeaderboard !== null) {
          return cachedLeaderboard;
      }
      // ... (Rest der Berechnung) ...
      cachedLeaderboard = items.sort((a, b) => b.growth - a.growth);
      return cachedLeaderboard;
  }
  ```
  Rufe `invalidateLeaderboardCache()` in `confirmImportDraft` (bei Erfolg) und in `rollbackBatch` auf.

---

### 3. Performance: Massiver N\*M\*K Query-Flaschenhals im Leaderboard (High)
* **Datei:** [growth.ts](file:///Users/koala/Documents/Workspaces/KoalaData/src/lib/server/growth.ts#L45-L117) und [+page.server.ts (Projekt)](file:///Users/koala/Documents/Workspaces/KoalaData/src/routes/p/%5Bslug%5D/+page.server.ts#L48-L69)
* **Problem:**
  In `getLeaderboard` wird über alle qualifizierten Projekte iteriert. Für jedes Projekt (N) werden die Datenquellen geladen (M). Für jede Datenquelle werden alle Metrikdefinitionen geladen (K). Für jede Metrik wird `getEffectiveObservations` aufgerufen, welches eine komplexe CTE-Abfrage an SQLite absetzt. Bei 100 Projekten mit je 2 Metriken führt dies zu hunderten separaten Datenbankabfragen pro Seitenaufruf. Ein ähnlicher N+1 Query-Flaschenhals befindet sich beim Laden der Projekt-Dashboards in `src/routes/p/[slug]/+page.server.ts`.
* **Behebungsvorschlag:**
  Refaktoriere die Abfrage so, dass alle effektiven Observations für alle relevanten Projekte und Metriktypen (`active_users` und `installs`) mit einer einzigen, optimierten SQL-Abfrage aus der Datenbank geladen werden.
  
  **Optimierte Query für `getLeaderboard`:**
  ```typescript
  import { sql } from 'drizzle-orm';

  // Eine einzige, performante Query für alle Projekte & Metriken
  const rawResults = await db.execute(sql`
      WITH ranked_observations AS (
          SELECT 
              p.id AS project_id,
              md.metric_type,
              o.date,
              o.value,
              ROW_NUMBER() OVER (
                  PARTITION BY o.source_id, o.metric_id, o.date, o.dimensions
                  ORDER BY b.completed_at DESC, o.id DESC
              ) as rn
          FROM projects p
          INNER JOIN data_sources ds ON ds.project_id = p.id
          INNER JOIN metric_definitions md ON md.source_id = ds.id
          INNER JOIN metric_observations o ON o.metric_id = md.id
          INNER JOIN import_batches b ON o.import_batch_id = b.id
          WHERE p.visibility = 'public'
            AND p.leaderboard_opt_in = 1
            AND p.leaderboard_status = 'approved'
            AND p.deleted_at IS NULL
            AND p.moderation_status = 'active'
            AND md.metric_type IN ('active_users', 'installs')
            AND b.status = 'completed'
            AND b.reverted_at IS NULL
      )
      SELECT project_id, metric_type, date, value
      FROM ranked_observations
      WHERE rn = 1
      ORDER BY project_id, metric_type, date ASC
  `);
  ```
  Gruppiere und berechne die Ergebnisse anschließend effizient im Arbeitsspeicher in TypeScript. Dieselbe Logik kann für `src/routes/p/[slug]/+page.server.ts` angewendet werden, indem die Filter auf das eine spezifische Projekt begrenzt werden.

---

### 4. Performance: N-Queries beim CSV-Import in einer Schleife (High)
* **Datei:** [pipeline.ts](file:///Users/koala/Documents/Workspaces/KoalaData/src/lib/server/csv/pipeline.ts#L316-L327)
* **Problem:**
  Während des CSV-Imports wird für jede Zeile und jede gemappte Metrik ein Overlap-Check per Datenbank-Query ausgeführt. Hat ein CSV-Import 10.000 Zeilen und 3 Metrik-Spalten, führt dies zu 30.000 einzelnen, asynchronen Queries. Dies führt zu einer extrem schlechten Import-Performance und sperrt die SQLite-Datenbank für andere Nutzer.
* **Behebungsvorschlag:**
  Führe ein Batch-Checking durch. Ermittle vor der Hauptschleife den Datumsbereich (Min/Max Date) und die IDs der beteiligten Metriken. Rufe alle existierenden Observations in diesem Bereich mit einer einzigen Query ab und speichere sie in einem speichereffizienten In-Memory-`Set`.
  
  **Beispielhafter Code-Entwurf:**
  ```typescript
  // 1. Min/Max-Datum und Metrik-IDs ermitteln
  const metricIds = Array.from(dbMetricsMap.values()).map((m) => m.id);
  const validDates = parsed.rows
      .map((row) => {
          try { return parseDateString(row[dateColIdx], mappingConfig.dateFormat); }
          catch { return null; }
      })
      .filter((d): d is string => d !== null);

  if (validDates.length > 0) {
      const minDateStr = validDates.reduce((min, d) => d < min ? d : min, validDates[0]);
      const maxDateStr = validDates.reduce((max, d) => d > max ? d : max, validDates[0]);

      // 2. Existierende Datensätze im Batch abfragen
      const existingRows = await db
          .select({ metricId: metricObservations.metricId, date: metricObservations.date })
          .from(metricObservations)
          .innerJoin(importBatches, eq(metricObservations.importBatchId, importBatches.id))
          .where(
              and(
                  inArray(metricObservations.metricId, metricIds),
                  gte(metricObservations.date, minDateStr),
                  lte(metricObservations.date, maxDateStr),
                  eq(importBatches.status, 'completed'),
                  isNull(importBatches.revertedAt)
              )
          );

      const dbOverlapsSet = new Set(existingRows.map((r) => `${r.metricId}:${r.date}`));

      // 3. In der Schleife O(1) im Speicher prüfen statt DB-Abfrage
      // statt dbOverlaps:
      if (dbOverlapsSet.has(logicalKey)) {
          overlapCount++;
      }
  }
  ```

---

### 5. Race Condition: Unhandled ENOENT & Double-Submit bei CSV-Import (High)
* **Datei:** [pipeline.ts](file:///Users/koala/Documents/Workspaces/KoalaData/src/lib/server/csv/pipeline.ts#L188-L212)
* **Problem:**
  Wenn ein User den "Confirm"-Button doppelt anklickt, werden zwei parallele Anfragen an den Server geschickt. Der Draft-Status wird erst am Ende der Transaktion gelöscht. Beide Anfragen sehen anfangs, dass der Entwurf existiert und die temporäre Datei vorhanden ist. Request 1 benennt die Datei per `fs.renameSync` um. Request 2 versucht unmittelbar danach, dieselbe temporäre Datei umzubennen, was fehlschlägt und einen unhandled `ENOENT` Exception auslöst.
* **Behebungsvorschlag:**
  Führe ganz zu Beginn von `confirmImportDraft` eine atomare Löschung des Drafts aus. Wenn keine Zeilen gelöscht wurden (`changes === 0`), bedeutet das, dass der Entwurf bereits von einer parallelen Anfrage verarbeitet wird.
  
  ```typescript
  // Atomare Sperrung des Drafts
  const deleteResult = await db.delete(importDrafts).where(eq(importDrafts.id, draftId));
  if (deleteResult.changes === 0) {
      throw new Error('Dieser Import-Draft wurde bereits verarbeitet oder existiert nicht mehr.');
  }
  ```

---

### 6. Race Condition: Erstellung von Metric-Definitions außerhalb der Transaktion (Medium)
* **Datei:** [pipeline.ts](file:///Users/koala/Documents/Workspaces/KoalaData/src/lib/server/csv/pipeline.ts#L240-L270)
* **Problem:**
  Der Check, ob eine Metrikdefinition (`metricDefinitions`) bereits existiert, und deren eventuelle Neuanlage geschehen per asynchronem `await` außerhalb der Haupttransaktion. Da es keinen Unique-Constraint im Schema für `source_id + metric_type + name` gibt, können konkurrierende Importe derselben Datenquelle Dubletten von Metrikdefinitionen anlegen, was zu inkonsistenten Aggregationen führt.
* **Behebungsvorschlag:**
  1. Ergänze im Datenbankschema ([schema.ts](file:///Users/koala/Documents/Workspaces/KoalaData/src/lib/server/db/schema.ts#L107)) einen eindeutigen Index auf die Tabelle `metric_definitions`:
     ```typescript
     }, (table) => ({
         sourceTypeMetricNameUnq: uniqueIndex('idx_metric_defs_unq').on(table.sourceId, table.metricType, table.name)
     }));
     ```
  2. Verlagere das Auflösen der Metrikdefinitionen in die synchrone SQLite-Transaktion (Drizzle-Transaktion mit better-sqlite3 unterstützt synchrone `.get()` und `.run()` Aufrufe):
     ```typescript
     // Innerhalb der Transaktion (db.transaction((tx) => { ... }))
     for (const m of metricMappings) {
         let metricDef = tx
             .select()
             .from(metricDefinitions)
             .where(
                 and(
                     eq(metricDefinitions.sourceId, draft.sourceId),
                     eq(metricDefinitions.metricType, m.metricType as any),
                     eq(metricDefinitions.name, m.name)
                 )
             )
             .get();

         if (!metricDef) {
             const metricId = crypto.randomUUID();
             metricDef = {
                 id: metricId,
                 sourceId: draft.sourceId,
                 metricType: m.metricType as any,
                 name: m.name,
                 unit: m.unit as any,
                 aggregation: m.aggregation as any,
                 isCumulative: m.isCumulative ? 1 : 0,
                 participatesInLeaderboard: ['active_users', 'installs'].includes(m.metricType) ? 1 : 0,
                 createdAt: now
             };
             tx.insert(metricDefinitions).values(metricDef).run();
         }
         dbMetricsMap.set(m.columnName, metricDef);
     }
     ```

---

### 7. Ressourcen-Leak: Zurückgerollte CSV-Importe hinterlassen Dateileichen & füllen Speicher-Quota (Medium)
* **Datei:** [+page.server.ts (Rollback)](file:///Users/koala/Documents/Workspaces/KoalaData/src/routes/app/projects/%5Bid%5D/imports/+page.server.ts#L93-L102) und [limits.ts](file:///Users/koala/Documents/Workspaces/KoalaData/src/lib/server/limits.ts#L48-L60)
* **Problem:**
  Bei einem Rollback eines Import-Batches (`rollbackBatch`) wird lediglich `revertedAt` in `importBatches` gesetzt. Die physische CSV-Datei bleibt im Ordner `uploads/` liegen und `rawFileDeletedAt` bleibt `null`. Zudem verbleiben die Observations in `metric_observations`. 
  Da der Speicherverbrauch des Nutzers über alle Import-Batches berechnet wird, bei denen `rawFileDeletedAt` null is, blockieren zurückgesetzte Importe dauerhaft den Speicher-Quota des Nutzers. Es gibt keinen bereinigenden Cronjob oder manuelle Löschung.
* **Behebungsvorschlag:**
  Beim Ausführen des Rollbacks sollte die physische Datei gelöscht, `rawFileDeletedAt` auf das aktuelle Datum gesetzt und die dazugehörigen Observations aus `metricObservations` gelöscht werden:
  
  ```typescript
  // Innerhalb der Transaktion beim Rollback
  const batch = tx.select().from(importBatches).where(eq(importBatches.id, batchId)).get();
  if (batch && batch.storedFilename) {
      const dataDir = process.env.DATA_DIRECTORY || './data';
      const filePath = path.join(dataDir, 'uploads', batch.storedFilename);
      try {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (e) {
          console.error('Failed to delete physical file during rollback:', e);
      }
      
      // Physisches Löschen der Observations
      tx.delete(metricObservations).where(eq(metricObservations.importBatchId, batchId)).run();
      
      // Update Batch Status
      tx.update(importBatches)
        .set({
            revertedAt: now,
            rawFileDeletedAt: now
        })
        .where(eq(importBatches.id, batchId))
        .run();
  }
  ```

---

### 8. Security: Passwortänderungs-Zwang wird serverseitig nicht erzwungen (Medium)
* **Datei:** [hooks.server.ts](file:///Users/koala/Documents/Workspaces/KoalaData/src/hooks.server.ts#L75-L91)
* **Problem:**
  Wenn ein Administrator das Flag `forcePasswordChange = 1` für einen Benutzer setzt, wird im Layout lediglich ein optisches Warnbanner eingeblendet. Der serverseitige Request-Hook (`hooks.server.ts`) blockiert jedoch keine Anfragen. Der betroffene Benutzer kann beliebige Dashboards einsehen, Daten importieren und Einstellungen ändern, ohne sein Passwort zu ändern, indem er einfach das Frontend umgeht (z. B. durch direkte API-Aufrufe oder CSS-Ausblendung).
* **Behebungsvorschlag:**
  Ergänze in `hooks.server.ts` eine serverseitige Prüfung, die alle Anfragen unter `/app` (außer der Seite zum Passwort-Ändern und dem Logout-Action) blockiert und den Benutzer umleitet.
  
  ```typescript
  if (pathname.startsWith('/app')) {
      if (!event.locals.user) {
          throw redirect(302, `/login?redirectTo=${encodeURIComponent(pathname)}`);
      }
      if (event.locals.user.status === 'pending') {
          throw redirect(302, '/login?error=pending_approval');
      }
      // Serverseitiger Schutz vor ausstehender Passwortänderung
      if (event.locals.user.forcePasswordChange === 1 && pathname !== '/app/account/security' && !pathname.includes('/login?/logout')) {
          throw redirect(302, '/app/account/security?error=password_change_required');
      }
  }
  ```

---

### 9. UX / QoL: Visuelles Flackern (FOUC) im System-Dark-Mode (Medium)
* **Dateien:** [app.html](file:///Users/koala/Documents/Workspaces/KoalaData/src/app.html#L11) und [+layout.svelte](file:///Users/koala/Documents/Workspaces/KoalaData/src/routes/+layout.svelte#L44-L45)
* **Problem:**
  Die Inline-Skript-Prüfung in `app.html` sucht im LocalStorage nach dem Wert `'system'`, um das System-Theme zu verifizieren. In `+layout.svelte` wird das automatische System-Theme jedoch als `'auto'` im LocalStorage abgespeichert. 
  Wenn ein Benutzer das Theme auf "Auto" setzt und das System-Dark-Mode aktiv ist, liest `app.html` den Wert `'auto'`, erkennt ihn nicht als `'system'` und entfernt die Klasse `dark` vom HTML-Element. Svelte bootet anschließend, liest den Wert `'auto'` ein, erkennt das System-Theme und fügt die Klasse `dark` wieder hinzu. Dies führt bei jedem einzelnen Seitenaufruf zu einem hellen Aufblitzen (FOUC) für den Benutzer.
* **Behebungsvorschlag:**
  Passe das Inline-Skript in `app.html` so an, dass es sowohl auf `'system'` als auch auf `'auto'` reagiert:
  ```html
  <script nonce="%sveltekit.nonce%">
      try {
          const theme = localStorage.getItem('theme') || 'auto';
          if (theme === 'dark' || (theme === 'auto' || theme === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches) {
              document.documentElement.classList.add('dark');
          } else {
              document.documentElement.classList.remove('dark');
          }
      } catch (e) {}
  </script>
  ```

---

### 10. Security: Passwort-Hash wird in `locals.user` gehalten (Low)
* **Datei:** [auth.ts](file:///Users/koala/Documents/Workspaces/KoalaData/src/lib/server/auth.ts#L165)
* **Problem:**
  `validateSession` gibt das komplette User-Objekt inklusive `passwordHash` zurück, welches anschließend in `event.locals.user` gespeichert wird. Dies stellt ein Sicherheitsrisiko dar, da das `locals.user`-Objekt im Serverkontext häufig geloggt, in Fehlermeldungen ausgegeben oder unabsichtlich an API-Clients serialisiert werden kann.
* **Behebungsvorschlag:**
  Entferne den Passwort-Hash vor der Rückgabe in `validateSession`:
  ```typescript
  // validateSession in auth.ts
  const { session, user } = result[0];
  const { passwordHash, ...safeUser } = user;
  // ...
  return { session, user: safeUser };
  ```

---

### 11. UX / QoL: Date-Filter-Buttons sind unchronologisch sortiert (Low)
* **Datei:** [+page.svelte (Projekt)](file:///Users/koala/Documents/Workspaces/KoalaData/src/routes/p/%5Bslug%5D/+page.svelte#L93-L113)
* **Problem:**
  Die Filter-Schaltflächen für den Zeitbereich sind in folgender Reihenfolge sortiert: `7D`, `Last 30 Days`, `1Y`, `Last 90 Days`, `All Time`. Die Platzierung von `1Y` (1 Jahr) vor `Last 90 Days` ist unlogisch und stört den Lesefluss des Benutzers.
* **Behebungsvorschlag:**
  Ordne die Buttons chronologisch an:
  ```svelte
  <button class="btn btn-secondary btn-sm {dateFilter === '7' ? 'active' : ''}" onclick={() => dateFilter = '7'}>7D</button>
  <button class="btn btn-secondary btn-sm {dateFilter === '30' ? 'active' : ''}" onclick={() => dateFilter = '30'}>30D</button>
  <button class="btn btn-secondary btn-sm {dateFilter === '90' ? 'active' : ''}" onclick={() => dateFilter = '90'}>90D</button>
  <button class="btn btn-secondary btn-sm {dateFilter === '365' ? 'active' : ''}" onclick={() => dateFilter = '365'}>1Y</button>
  <button class="btn btn-secondary btn-sm {dateFilter === 'all' ? 'active' : ''}" onclick={() => dateFilter = 'all'}>All Time</button>
  ```

---

### 12. UX / QoL: Unklare Prozentberechnung im Leaderboard (Low)
* **Datei:** [growth.ts](file:///Users/koala/Documents/Workspaces/KoalaData/src/lib/server/growth.ts#L100)
* **Problem:**
  Im Leaderboard wird das prozentuale Wachstum stumm auf `0` gesetzt, wenn der WAU-Startwert vor 30 Tagen weniger als 25 betrug. Dies soll Ausreißer bei minimalen Nutzerzahlen verhindern, ist jedoch für den Benutzer im Frontend nicht ersichtlich. Nutzer wundern sich, warum ihr Projekt wächst (z. B. von 10 auf 50 Nutzer), aber 0% Wachstum angezeigt wird.
* **Behebungsvorschlag:**
  1. Dokumentiere dieses Verhalten im Frontend, indem ein kleiner Infotext oder ein Tooltip neben der Tabellenüberschrift platziert wird.
  2. Alternativ könnte ein Text wie `n/a` oder `< 25 Users` statt `0.0%` angezeigt werden, um Verwirrung zu vermeiden.

---

### 13. Robustheit: Fehlende Spaltengrenzen-Prüfung bei CSV-Zeilen (Low)
* **Datei:** [pipeline.ts](file:///Users/koala/Documents/Workspaces/KoalaData/src/lib/server/csv/pipeline.ts#L289-L297)
* **Problem:**
  Wenn eine Zeile in der CSV-Datei weniger Spalten hat als im Header definiert (z. B. durch ein fehlendes Trennzeichen am Ende der Zeile), liefert `row[dateColIdx]` oder `row[m.columnIndex]` den Wert `undefined`. In `parseDateString` wird daraufhin `dateStr.trim()` aufgerufen, was zu einem unhandled `TypeError` führt. Dies wird zwar im globalen Try-Catch gefangen, führt jedoch zu einer ungenauen Fehleranzahl ohne konkrete Fehlerbeschreibung.
* **Behebungsvorschlag:**
  Ergänze Bounds-Checks vor der Auswertung der Spaltenwerte:
  ```typescript
  const rawDate = row[dateColIdx];
  if (rawDate === undefined) {
      throw new Error(`Date column at index ${dateColIdx} is missing in row ${rIdx + 1}`);
  }
  const parsedDate = parseDateString(rawDate, mappingConfig.dateFormat);
  ```
  Führe dieselben Abfragen auch für die Metrikspalten aus.

---

### 14. Ressourcen-Leak: Rate-Limit Records sammeln sich dauerhaft an (Low)
* **Datei:** [limiter.ts](file:///Users/koala/Documents/Workspaces/KoalaData/src/lib/server/security/limiter.ts)
* **Problem:**
  Jede Rate-Limit-Prüfung legt für die Kombination aus IP-Adresse und Aktion einen Datensatz in der Tabelle `rateLimitRecords` an. Diese Datensätze verbleiben für immer in der SQLite-Datenbank. Bei einer kontinuierlich laufenden Instanz im Internet mit wechselnden IP-Adressen führt dies zu einem stetigen Wachstum der SQLite-Datei (Speicherleck).
* **Behebungsvorschlag:**
  Füge in `hooks.server.ts` beim Serverstart und im Intervall (z. B. zusammen mit der Draft-Bereinigung) einen Cleanup-Befehl für alte Rate-Limit-Einträge hinzu:
  ```typescript
  // In hooks.server.ts -> init()
  async function cleanupExpiredLimiters() {
      const oneDayAgo = Math.floor(Date.now() / 1000) - (24 * 60 * 60);
      await db.delete(rateLimitRecords).where(lte(rateLimitRecords.lastUpdated, oneDayAgo));
  }
  ```
