# Changelog

## v1.5.15 - 2026-07-29

- Automatically import official Firefox AMO `downloads-day-*.csv` and `usage-day-*.csv` reports, including their leading `#` metadata lines.
- Show source-specific CSV export guidance for Chrome Web Store, Firefox Add-ons, and Microsoft Edge Add-ons instead of generating Chrome developer-console links for non-Chrome sources.
- Link Microsoft Edge publishers to Partner Center extension analytics and keep unconfirmed Edge CSV layouts in explicit mapping review.

## v1.5.14 - 2026-07-29

- Replace the misleading `PRIVACY-FIRST ANALYTICS` project-header label in chart exports with a project-specific subtitle.
- Add an editable 60-character project-subtitle field to the share dialog, prefilled from the existing short description and optimized for a 3-5 word recap.
- Pass the project recap through every public trend and ratings export, with browser regression coverage for initialization and live preview updates.

## v1.5.13 - 2026-07-29

- Add graph-focused, balanced, and minimal share-export presets with a configurable 45-82% graph-height target.
- Let users independently show or hide the project header, title, headline value, generated insight, data details, logo, and KoalaData footer.
- Add a custom 140-character image caption that also customizes the suggested post text.
- Reflow visible export content dynamically so hidden context gives the graph more room, with a sticky live preview and browser regression coverage.

## v1.5.12 - 2026-07-29

- Make chart-share previews compatible with the production Content Security Policy by rendering them as PNG data URLs instead of blocked blob URLs.
- Verify that the preview source is CSP-safe and that the browser actually decodes the expected 1200x628 image.

## v1.5.11 - 2026-07-29

- Add professional, theme-aware chart sharing with fixed social-media formats, project branding, KPI summaries, comparison context, data dates, and direct series labels.
- Include enabled 7-day averages, record points, project events, and release markers in exported chart images.
- Add one-shot animated GIF exports that reveal each chart once and hold on the completed frame.
- Add clipboard image/text actions, suggested post copy, export previews, accessibility controls, and browser-level PNG/GIF regression coverage.

## v1.5.10 - 2026-07-28

- Replace the easy-to-miss CSV import badge with a persistent completion panel, clear next actions, upload reset, duplicate-submit protection, and exact-file duplicate detection.
- Keep dashboard onboarding project-specific so every checklist action targets the same incomplete project.
- Replace the decorative project setup indicator with a validated three-step creation flow and final review.
- Render import history as readable mobile cards and cover the full onboarding/import flow with regression tests.

## v1.5.9 - 2026-07-26

- Harden Event Impact calculation with UTC millisecond Date arithmetic for 100% timezone-independent range queries.
- Clean up unstyled button CSS overrides and resolve interactive element accessibility warnings.

## v1.5.8 - 2026-07-26

- Add Event Impact Score (Kausalitäts-Analyse) comparing 7-day pre- vs. post-event metric averages (Installs, Active Users).
- Display interactive Event Impact Badges in event management view and impact summaries in metric chart tooltips.
- Add unit tests for 7-day event impact calculation and data threshold fallbacks.

## v1.5.7 - 2026-07-26

- Add manual Project Events & Milestones management with interactive timeline markers, category filters, and rich hover tooltips.
- Add Smart Event Suggestions in maintainer view detecting version releases, publisher verification badges, and growth spikes for 1-click timeline import.
- Harden event tooltips against XSS and sanitize inputs across metric charts.

## v1.5.6 - 2026-07-26

- Hardened security rate limiters and import pipeline boundaries.

- Gate commits and container publishing on real fresh-volume and existing-volume startup tests.
- Require a clean, pushed, version-matched commit with successful CI before the official release command can create and push a tag.

## v1.5.4 - 2026-07-26

- Upgrade production and CI runtimes from Node.js 22 to Node.js 26.
- Upgrade compatible npm dependencies, including Playwright 1.62, Svelte 5.56.8, better-sqlite3 13.0.1, and Node.js types 26.1.1.
- Upgrade GitHub Actions checkout to v5 to remove the Node.js 20 runtime warning.
- Repair legacy root-owned Docker volume permissions before dropping to the unprivileged application user.

## v1.5.3 - 2026-07-26

- Align production request-body limits with CSV and logo upload limits.
- Decouple test and rate-limit switches from secure cookies and mandatory password changes.
- Persist token-bucket rate limits in SQLite and equalize unknown-user login verification timing.
- Make final-administrator protection and import storage quotas atomic under concurrent requests.
- Restrict Chrome automatic imports to recognized reports and record automatic versus manual import provenance.
- Limit public project payloads to public fields and paginate server-side discovery queries.
- Improve share-card dialog focus management, canvas labeling, long-text fitting, and footer contrast.
- Harden Windows test cleanup, production shutdown, non-root containers, backup documentation, and tag release verification.

## v1.5.2 - 2026-07-23

- Restore automatic background CSV import for high-confidence Chrome Web Store exports.
- Add "Import All Pending" batch action to auto-import all pending draft CSVs in one click.
- Expand German Chrome Web Store header alias matching for store impressions, store page views, and date fields.
- Harden CSV parsing pipeline against null/undefined headers and concurrency edge cases.

## v1.5.1 - 2026-07-23

- Fix vertical alignment of footer dot separators across viewports.
- Display injected release version string dynamically in the footer GitHub repository link.

## v1.5.0 - 2026-07-23

- Add interactive Drag & Drop CSV upload zone with file preview and size badges on project imports.
- Add optional extension version release markers on timeline charts with single-click toggle (disabled by default).
- Expand data sources schema and report catalog to support Firefox Add-ons (AMO) and Microsoft Edge Add-ons CSV exports.
- Add visual acquisition conversion funnel card calculating Click-Through Rate (CTR) and Install Conversion Rate.
- Add social media share card generator rendering 1200x630 high-resolution PNG images with dark/light theme options.

## v1.4.9 - 2026-07-23

- Publish releases exclusively as GHCR container images and link the site footer directly to the GitHub repository.
- Remove empty rating placeholders from project cards, label unavailable leaderboard ratings clearly, and trim charts to their first populated datapoint.
- Add CI policy enforcement that rejects GitHub Release creation from the container workflow.

## v1.4.8 - 2026-07-23

- Replace raw dashboard breakdown histories with server-side summaries for the supported 7, 30, 90, and 365-day periods.
- Remove internal observation identifiers and timestamps from public payloads and eliminate the correlated snapshot query.
- Keep charts scroll-safe with explicit slider-only zoom and regression coverage for wheel and touchpad behavior.
- Enforce compact 50,000-row dashboard payloads, fast logo client navigation, and realistic multi-import performance fixtures.
- Run Playwright coverage in Chromium and Firefox, remove a cross-browser login race, and enlarge small dashboard touch targets.

## v1.4.7 - 2026-07-23

- Consolidate localized extension-version reports into one breakdown instead of rendering one graph per version.
- Remove touchpad wheel capture from charts while retaining an explicit range slider for long series.
- Materialize public project summaries in SQLite so landing, discovery, and leaderboard requests never scan raw observations.
- Bound dashboard snapshot payloads before windowing and paginate growing import histories.
- Remove unused landing-page data, per-request package reads, serial admin queries, and synchronous admin filesystem work.
- Add request-path indexes and performance regressions for large public datasets.

## v1.4.6 - 2026-07-23

- Prevent cancelled enhanced forms from submitting destructive project, source, ownership, or rollback actions.
- Harden parallel ownership transfers, logo replacement, import confirmation, and rollback behavior.
- Protect project OG images with project visibility rules and reject invalid or empty CSV mappings.
- Reuse a single prewarmed public-statistics snapshot, bound public chart history, and add production query indexes.
- Verify discovery assets, responsive widths, tenant isolation, realistic warm TTFB, and isolated test databases.
- Start the Lighthouse preview with versioned migrations and isolated CI credentials instead of an interactive schema push.

## v1.4.5 - 2026-07-22

- Preserve every project settings field after a successful enhanced submit without a reload.

## v1.4.4 - 2026-07-22

- Refresh public ranking snapshots at startup and on a background schedule while serving stale data during refresh failures.

## v1.4.3 - 2026-07-22

- Cache public leaderboard and project-card aggregates with refresh deduplication and bounded cache growth.

## v1.4.2 - 2026-07-22

- Harden project workflows, import compensation, permissions, test-database isolation, URLs, tooltips, and public error states.

## v1.4.1 - 2026-07-22

- Add public SEO metadata, discovery files, legal content, responsive launch UX, version injection, and complete brand assets.

## v1.4.0 - 2026-07-22

### Reddit launch readiness

- Add first-run onboarding, clearer registration and project-submission guidance, contextual tooltips, public-dashboard sharing, reporting, FAQ, legal, security, sitemap, error, and moderation states.
- Require a review preview for every CSV and support localized report names, headers, numbers, dates, delimiters, UTF-8, and UTF-16 exports.
- Validate external URLs, require safe production administrator credentials, remove third-party favicon lookups, and default new submissions to a moderation queue.
- Add automated Chrome Web Store sources from project metadata and document current deployment variables and import behavior.
- Explain password, session-cookie, account-recovery, and network-data handling at login and in the privacy policy; minimize persisted IP addresses and user agents.
- Add a public repository link, contributor and security guidance, community templates, dependency updates, and complete package metadata.
- Add truthful Free, Freemium, Paid, and Open Source project badges plus pricing/open-source filters and sortable rating, weekly-user, and daily-install summaries on public listings.
- Document crawlable publisher links and open the Chrome Web Store statistics dashboard with `?hl=en` for consistent export names while retaining localized CSV support.

## v1.3.4 - 2026-07-22

### Rating analytics

- Treat Chrome Web Store rating exports as daily rating flows instead of incorrectly displaying only the latest day's value.
- Add separate full-width views for the selected-period star distribution and the daily star-by-star timeline.
- Give each star level a consistent color and preserve zero-rating days in the timeline.

## v1.3.3 - 2026-07-22

### Readable analytics layout

- Give every time-series chart the full dashboard width so dates, controls, and trends remain readable on desktop.
- Replace side-by-side acquisition and audience breakdowns with accessible tabs that show one complete dataset at a time.
- Improve chart sizing and date-axis density, highlight the active dashboard section, and show a clear empty state for zero-value reports.

## v1.3.2 - 2026-07-22

### Trustworthy grouped analytics

- Group Chrome Web Store region, language, operating-system, version, rating, and enabled-state reports into readable breakdown cards instead of rendering one chart per CSV column.
- Keep every imported category available in complete ranked tables while limiting the overview to top categories plus an aggregated long tail.
- Treat installs and uninstalls as period flows, and weekly users, versions, ratings, and enabled state as latest snapshots.
- Store future recognized Chrome Web Store breakdown columns as dimensions and merge them deterministically with legacy metric definitions at read time without deleting historical data.
- Replace misleading CTR, conversion-funnel, active-user, and churn claims with independently sourced counts and accurately named weekly installed-user metrics.
- Use calendar-based time windows, chronological weekday bars with visible values, responsive product CTAs, and substantially fewer chart instances.

### Landing page and quality budget

- Replace the oversized stacked landing-page hero with a compact, responsive product message and a visible analytics illustration.
- Add page-specific search metadata and clearer primary, comparison, and registration actions.
- Inline small critical styles, remove six webfont requests, tree-shake landing-page icons, and serve a lower-priority mobile hero image to shorten the first render.
- Evaluate Lighthouse budgets from the median of three runs to reject real regressions without failing on a single noisy measurement.
- Print the failing Lighthouse audits in CI and update the checkout and Node setup actions to their Node 24-compatible releases.

## v1.3.1 - 2026-07-22

### Import and dashboard fixes

- Automatically map all numeric Chrome Web Store export columns, including operating-system, region, language, version, rating, and activation reports.
- Keep same-named custom dimensions from different exports separate during automatic imports.
- Show summed Store Impressions and Store Page Views for the selected timeframe and scale day-of-week bars relative to the real maximum.
- Remove stale in-memory leaderboard results so approved public projects appear immediately after data or status changes.
- Correct the Chrome Web Store console link and add the larger landing-page AVIF, WebP, and PNG logo variants.

## v1.3.0 - 2026-07-22

### Release hardening

- Resolved all npm audit findings with safe overrides for the SvelteKit cookie dependency and Drizzle's nested esbuild loader.
- Moved `csv-parse` to production dependencies and externalized it from the SSR bundle so the production Docker image resolves it correctly without circular-bundle warnings.
- Kept ECharts in a dedicated on-demand chunk and calibrated the bundle warning threshold to its measured size.
- Added final npm audit, bundle-size, Docker build, and runtime health checks to the release verification.

## v1.2.1 - 2026-07-22

### Trustworthy analytics and branding

- Added responsive KoalaData brand assets with AVIF, WebP, PNG, ICO, and Apple touch icon variants.
- Disabled chart forecasts and moving averages by default; added accessible per-page toggles.
- Labeled forecast and milestone projections as estimates and based milestone dates on the latest observation.
- Aligned compare-mode series by relative day instead of mixing previous and current calendar dates.
- Added chart loading/error feedback, keyboard-visible export controls, and CSV escaping.
- Added chart-derived-data unit coverage and expanded pre-release validation to include the production build and Docker image.

## v1.0.3 - 2026-07-20

### Container publishing hardening

- Restricted the tag workflow to the permissions required to publish container images.
- Increased the Playwright production-server startup budget for slower CI runners.
- Raised light-theme link contrast for data-populated cards to meet WCAG AA.

## v1.0.2 - 2026-07-20

### Responsive UI and accessibility

- Constrained wide-screen content to a centered 1200px layout with fluid page gutters.
- Added responsive mobile navigation for the main application and administrator area.
- Refined light and dark palettes, typography, surfaces, cards, and interaction hierarchy.
- Replaced emoji controls and decoration with locally bundled Phosphor SVG icons.
- Renamed the automatic theme option from `System` to `Auto` and migrated saved preferences.
- Removed horizontal overflow across public pages at 320px, 390px, 768px, and 1920px viewports.
- Improved mobile cards, filters, tables, project tabs, forms, alerts, and account/session layouts.
- Added a skip link, visible focus states, active-page semantics, live regions, reduced-motion support, labels, and autocomplete hints.
- Added an application favicon and default metadata description.

### Security and performance

- Removed global third-party scripts and restricted CSP scripts and fonts to self-hosted resources.
- Split ECharts into on-demand chunks so chart code is only loaded on metric pages.
- Restored the documented SQLite backup command under the project's ESM configuration.
- Updated SvelteKit to 2.70.1.

### Quality assurance

- Added Axe accessibility coverage for light and dark modes.
- Added automated viewport-overflow and landmark regression tests.
- Added authenticated mobile dashboard and administrator navigation checks.
- Added a Lighthouse CI budget for performance, accessibility, best practices, SEO, and Core Web Vitals.

## v1.0.1 - 2026-07-19

### Security and data integrity

- Removed request-cookie logging and protected session tokens from debug output.
- Moved CSP nonce generation to SvelteKit so inline scripts and policy headers always match.
- Restricted post-login redirects to internal paths.
- Enforced invite-only registration on the server.
- Required explicit production administrator credentials in Docker Compose.
- Blocked deletion of data sources that contain imports, drafts, or metrics.

### Product and operations

- Unified username and display name across registration, navigation, administration, and project membership.
- Added automatic migration and database enforcement for unified usernames.
- Added administrator project restoration.
- Scheduled expired import-draft cleanup.
- Activated site title, public discovery, public leaderboard, and session-duration settings.
- Added pagination to user management and the audit log.
- Corrected the Docker health check to use the application's IPv4 listener.

### Analytics and quality

- Added 7-day and 1-year chart ranges with latest-value deltas.
- Reduced chart bundle size through modular ECharts imports and SVG rendering.
- Corrected aggregation values and migrated legacy values.
- Restored a clean Svelte/TypeScript check and replaced the ineffective formatting bypass with a strict whitespace check.
