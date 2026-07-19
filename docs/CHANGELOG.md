# Changelog

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
