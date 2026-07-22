# Changelog

## v1.2.0 - 2026-07-22

### Trustworthy analytics and branding

- Added responsive KoalaData brand assets with AVIF, WebP, PNG, ICO, and Apple touch icon variants.
- Disabled chart forecasts and moving averages by default; added accessible per-page toggles.
- Labeled forecast and milestone projections as estimates and based milestone dates on the latest observation.
- Aligned compare-mode series by relative day instead of mixing previous and current calendar dates.
- Added chart loading/error feedback, keyboard-visible export controls, and CSV escaping.
- Added chart-derived-data unit coverage and expanded pre-release validation to include the production build and Docker image.

## v1.0.3 - 2026-07-20

### Release hardening

- Granted the tag workflow the GitHub contents permission required to publish releases.
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
