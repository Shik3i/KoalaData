# KoalaData System Architecture

This document describes the design, database constraints, authentication sessions, conflict-resolution queries, and folder structures of the KoalaData MVP platform.

## 1. Core Tech Stack
- **Web Framework**: SvelteKit and Svelte 5 (utilizing runes for state management).
- **Styling**: Vanilla CSS with cohesive green/neutral design variables.
- **ORM & Database**: Drizzle ORM managing a local SQLite database (driven by the synchronous `better-sqlite3` driver).
- **Cryptography & Security**: `hash-wasm` providing Argon2id password hashes dynamically during runtime, session hashing with SHA-256, and token-bucket API rate limits.
- **Charts**: ECharts rendering client-side responsive SVG line graphs.

## 2. Database Design & Integrity
SQLite is configured on start to run in **Write-Ahead Logging (WAL) Mode** and enforces foreign key constraints (`PRAGMA foreign_keys = ON`).

### Key Constraints & Triggers
- **Username Uniqueness**: Username uniqueness is checked and case-normalized. Only alphanumeric usernames are allowed, checked in application services to accommodate SQLite's lack of native regular expression constraints.
- **Session Revokes**: Sessions are invalidated by hashing cookies (using SHA-256) and deleting matching tokens from the database. A banned or deleted user automatically has all sessions flushed via cascades.
- **Final Active Admin Protection**: Demoting, banning, or deleting an administrator verifies that at least one other active administrator remains in the system.
- **Single-Source Ownership**: Project ownership is tracked by a single field `projects.owner_id`. Editors are managed in the `project_members` table.
- **Soft Deletion**: Projects and Users are soft-deleted by writing a `deleted_at` timestamp. Soft-deleted projects cannot be read by visitors. Banned projects throw a 404.

## 3. CSV Import & Processing State Machine
- **Upload Sequencing**: Files must be written to their final path at `/data/uploads/[uuid].csv` prior to starting database inserts. If the transaction rollback is triggered, the newly moved CSV is deleted as a compensating action.
- **Import Drafts**: CSV uploads are staged in `import_drafts` with a 1-hour expiration. Staged files are placed in `/data/uploads/drafts/[uuid].tmp` and removed if expired or aborted.
- **Observations Storage**: Observation dates are parsed and formatted as `YYYY-MM-DD` strings.
- **Deterministic CTE Resolution**: Overlapping or conflicting date observations are resolved dynamically by querying observations ranked by `completed_at DESC, id DESC` within a single source and metric ID partition.

## 4. Leaderboard & Growth Rules
- **Staleness cutoff**: A project must have observations imported in the last 14 days to be ranked on the leaderboard.
- **Growth delta**: Weekly active users growth is calculated over a 30-day delta.
- **Baseline restriction**: To participate in percentage-growth rankings, the starting baseline user count must be at least 25 to prevent low-user extensions from distorting rankings.

## 5. Directory Mapping
- `/data/` - Database and uploads persistence volume mount.
- `/data/project-assets/` - Uploaded project logo images (JPEG, PNG, WebP verified via magic bytes).
- `/data/uploads/` - Confirmed CSV upload files.
- `/data/uploads/drafts/` - Temporary CSV upload drafts.
- `/backups/` - Scheduled automated SQLite databases online backups.
