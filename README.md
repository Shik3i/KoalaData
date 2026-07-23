<h1><img src="assets/brand/koaladata-icon-source.png" alt="KoalaData mascot" width="48" height="48" /> KoalaData</h1>

[![CI](https://github.com/Shik3i/KoalaData/actions/workflows/ci.yml/badge.svg)](https://github.com/Shik3i/KoalaData/actions/workflows/ci.yml)
[![Container](https://img.shields.io/badge/GHCR-koaladata-2496ED?logo=docker&logoColor=white)](https://github.com/Shik3i/KoalaData/pkgs/container/koaladata)
[![Support KoalaData](https://img.shields.io/badge/Ko--fi-Support%20KoalaData-FF5E5B?logo=ko-fi&logoColor=white)](https://support.koalastuff.net)
[![Security policy](https://img.shields.io/badge/security-policy-2d6645)](SECURITY.md)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**Shareable Chrome Web Store analytics without adding tracking code to an extension.**

[Live site](https://data.koalastuff.net) · [Explore dashboards](https://data.koalastuff.net/discover) · [Security](SECURITY.md) · [Contributing](CONTRIBUTING.md)

KoalaData imports aggregate CSV reports already available to Chrome Web Store publishers. Every file is previewed before it is committed, then presented as a responsive public, unlisted, or private dashboard.

![KoalaData: shareable Chrome Web Store analytics](static/og-koaladata.png)

> [!NOTE]
> KoalaData currently targets Chrome Web Store publisher exports. It does not scrape store listings, install an analytics SDK, or provide real-time user tracking.

## Why KoalaData?

- No extension SDK, injected script, fingerprinting, or user-level telemetry.
- Reviewable imports instead of silent metric guesses.
- Clear separation between flow metrics such as installs and snapshot metrics such as weekly users.
- Localized Chrome Web Store report recognition with a manual fallback.
- Public listing and leaderboard moderation.
- Responsive, accessible charts with CSV and PNG exports.
- Self-hosted Node.js and SQLite deployment with Docker support.

## Supported imports

KoalaData recognizes common report filenames and headers in English, German, French, Spanish, Portuguese, Italian, Dutch, Polish, and Turkish. Additional Japanese, Korean, and Chinese header aliases are supported where the structure is unambiguous.

The parser supports:

- UTF-8, UTF-8 BOM, UTF-16 LE, and UTF-16 BE;
- comma, semicolon, and tab delimiters outside quoted cells;
- localized date, decimal, and thousands-separator formats;
- installs, uninstalls, weekly users, impressions, store views, ratings, versions, regions, languages, operating systems, and enabled-state reports;
- duplicate and overlap diagnostics before confirmation.

See [CSV import pipeline](docs/csv-importers.md) for the mapping rules.

## Privacy and trust model

- Registration requires a username and password, not an email address.
- Passwords are stored only as Argon2id hashes.
- Login uses one essential HTTP-only session cookie; only its SHA-256 token hash is stored server-side.
- Persisted network addresses are reduced before storage.
- Raw CSV files remain private to authorized project members.
- No third-party analytics, advertising scripts, social embeds, or favicon lookups.
- Public projects and leaderboard participation require separate moderation decisions.

See the live [privacy policy](https://data.koalastuff.net/privacy), [security overview](https://data.koalastuff.net/security), and repository [security policy](SECURITY.md).

## Quick start with Docker Compose

Requirements: Docker Engine with Compose v2.

```bash
git clone https://github.com/Shik3i/KoalaData.git
cd KoalaData
cp .env.example .env
```

On PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

Set a unique `KOALADATA_ADMIN_PASSWORD` with at least 12 characters in `.env`. Production startup rejects missing passwords and documented placeholders.

```bash
docker compose up -d --build
docker compose ps
```

Open [http://localhost:3000](http://localhost:3000). The seeded administrator must change the initial password after first login.

### Published container

Versioned images and `latest` are published to GitHub Container Registry. Semantic Git tags trigger `.github/workflows/publish-container.yml`; they publish only container images. KoalaData does not use GitHub Releases or distribute application/source archives as release assets.

```bash
docker pull ghcr.io/shik3i/koaladata:latest
```

Use an immutable container tag instead of `latest` for production deployments:

```bash
docker pull ghcr.io/shik3i/koaladata:vX.Y.Z
```

## Configuration

| Variable | Purpose | Default |
| --- | --- | --- |
| `ORIGIN` | Public application origin used by SvelteKit security checks | `http://localhost:3000` |
| `PORT` | Node.js listen port | `3000` |
| `DATA_DIRECTORY` | Private uploads and project assets | `/data` in Compose |
| `DATABASE_PATH` | SQLite database file | `/data/data.db` in `.env.example` |
| `BACKUP_DIRECTORY` | Destination for managed SQLite backups | `/backups` in Compose |
| `KOALADATA_ADMIN_USERNAME` | Initial administrator username | `admin` |
| `KOALADATA_ADMIN_PASSWORD` | Required initial production password | none |
| `SESSION_MAX_AGE` | Session lifetime in seconds | `2592000` |

Back up the database, uploaded source files, and project assets together.

## HTTPS deployment

Run KoalaData behind a TLS-terminating reverse proxy and set `ORIGIN` to the exact public HTTPS origin.

```caddyfile
data.example.com {
    reverse_proxy localhost:3000
}
```

```env
ORIGIN=https://data.example.com
```

Use `GET /api/health` for container or reverse-proxy health checks. It reports service availability without exposing account or project data.

## Backups

Create a consistent SQLite backup from the running container:

```bash
docker compose exec app node scripts/backup.cjs
```

Backups are written to the configured backup volume and snapshots older than seven days are pruned. To restore, stop the application, replace the configured database file with the selected backup, then restart the service.

## Local development

Requirements: Node.js 22 and npm.

```bash
npm ci
npx drizzle-kit push
npm run dev
```

The development server is available at [http://localhost:5173](http://localhost:5173).

### Verification

```bash
npm run check
npm run test:unit -- --run
npm run test:e2e
npm run build
npm audit --audit-level=low
docker build --tag koaladata:local .
```

The CI workflow additionally checks formatting, accessibility, responsive layouts, Lighthouse budgets, and the Docker build.

## Project structure

```text
src/routes/             SvelteKit pages and server actions
src/lib/server/         authentication, database, imports, permissions
src/lib/components/     dashboard and visualization components
migrations/             versioned SQLite migrations
docs/                   architecture, import, changelog, security notes
.github/workflows/      CI and GHCR publishing
```

See [architecture](docs/architecture.md) for the data model and request flow.

## Contributing and support

- Bugs: use the [bug report template](https://github.com/Shik3i/KoalaData/issues/new?template=bug_report.yml).
- Feature ideas: use the [feature request template](https://github.com/Shik3i/KoalaData/issues/new?template=feature_request.yml).
- Code changes: read [CONTRIBUTING.md](CONTRIBUTING.md).
- Security vulnerabilities: do **not** open a public issue; follow [SECURITY.md](SECURITY.md).
- Usage and operator contact: [KoalaData imprint](https://data.koalastuff.net/imprint).

## License

KoalaData is available under the [MIT License](LICENSE).
