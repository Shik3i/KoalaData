# 🐨 KoalaData

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Svelte](https://img.shields.io/badge/Svelte-5.0-orange.svg)](https://svelte.dev)
[![Docker](https://img.shields.io/badge/Docker-Compatible-blue.svg)](https://www.docker.com)

**KoalaData** is a modern, self-hosted open-analytics platform built specifically for browser-extension developers. It enables developers to track active users, installations, uninstalls, store page views, and impressions with beautiful, responsive dashboards and dynamic growth leaderboards.

KoalaData aims to replace complex, bloated analytics tools with a lightweight, secure, and privacy-respecting self-hosted solution.

---

## 🌟 Key Features

* **Chrome Web Store Auto-Import:** Simply download your stats CSVs from the CWS Developer Console and upload them. KoalaData automatically parses, aligns, and merges German or English formats without manual mapping.
* **Dynamic & Responsive Charts:** Native ECharts integration with dynamic theme switching. Charts adjust layout dynamically (stacked vertical grid) and automatically adapt colors for high-contrast light and dark mode.
* **Privacy by Design:** Strict Content Security Policy (`img-src 'self' data:`). Features like website favicons are downloaded and cached serverseitig in Node to prevent exposing client IPs or violating CSP.
* **Growth Leaderboard:** A public leaderboard ranking all approved extensions based on weekly active user growth over the last 30 days. Powered by high-performance SQLite CTE queries.
* **Role-Based Access Control:** Secure account system supporting `admin` and `publisher` roles, registration approval queue, and forced initial password change flow.
* **Robust Backup Pipeline:** Built-in automated online database backups without requiring external CLI clients. Older snapshots are automatically pruned.
* **Production-Ready Docker Setup:** Fully optimized multi-stage `Dockerfile` and `docker-compose.yml` configurations for deployment in seconds.

---

## 🚀 Quick Start (Docker Compose)

The easiest way to run KoalaData in production is via Docker Compose:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Shik3i/KoalaData.git
   cd KoalaData
   ```

2. **Launch the stack:**
   ```bash
   docker compose up -d --build
   ```

3. **Access the application:**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Initial Login:**
   On startup, KoalaData seeds a default administrator account:
   * **Username:** `admin`
   * **Password:** `admin_password`
   
   > [!IMPORTANT]
   > Log in immediately and navigate to **Profile Settings -> Security** to change your password. A security warning banner will be displayed until the default password is changed.

---

## ⚙️ Environment Variables Reference

KoalaData can be configured using environment variables in your `docker-compose.yml` or `.env` file:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `ORIGIN` | The public URL of your instance (required for SvelteKit CSRF checks). | `http://localhost:3000` |
| `PORT` | The port the Node server listens on. | `3000` |
| `DATA_DIRECTORY` | Path where SQLite DB, uploaded logos, and CSV logs are stored. | `./data` |
| `DATABASE_URL` | Drizzle SQLite connection string. | `file:./data/data.db` |
| `ADMIN_DEFAULT_USER` | Username of the automatically seeded first admin. | `admin` |
| `ADMIN_DEFAULT_PASS` | Password of the automatically seeded first admin. | `admin_password` |
| `NODE_ENV` | Run environment (development / production). | `production` |

---

## 🔒 Production HTTPS Deployment (Caddy)

To deploy KoalaData behind a Caddy reverse proxy with automated SSL certificate provisioning:

1. Ensure the container maps port `3000` on localhost.
2. Add the following block to your host's `/etc/caddy/Caddyfile`:
   ```caddyfile
   koaladata.yourdomain.com {
       reverse_proxy localhost:3000
   }
   ```
3. Set the `ORIGIN` environment variable in your compose file to match:
   ```yaml
   environment:
     - ORIGIN=https://koaladata.yourdomain.com
   ```
4. Reload Caddy to apply changes:
   ```bash
   caddy reload --config /etc/caddy/Caddyfile
   ```

---

## 💾 Backups and Restore

### Create a Database Backup
Trigger a database snapshot inside the active container:
```bash
docker compose exec app node scripts/backup.cjs
```
This writes a copy (`backup-[timestamp].db`) to the host `./backups/` directory and removes snapshots older than 7 days.

### Restore a Backup
1. Stop the container: `docker compose down`
2. Replace `/data/data.db` with your selected backup file.
3. Restart the container: `docker compose up -d`

---

## 🛠️ Local Development Setup

To run and modify KoalaData locally on your system:

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Migrations
Initialize your local development database and push the schema:
```bash
npx drizzle-kit push
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173).

### 4. Running Checks and Tests
We enforce a strict pre-release validation flow. Before committing any code, run:
```bash
# Svelte and TypeScript static typecheck
npm run check

# Vitest Unit Tests
npm run test:unit -- --run

# Production build
npm run build

# Playwright E2E Integration Tests
npx playwright test

# Docker release image validation
docker build --tag koaladata:pre-release .
docker image inspect koaladata:pre-release
```
Or execute the automated validation script:
```bash
./scripts/pre-release.sh
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
🐨 Hand-crafted with nature-inspired aesthetics.
