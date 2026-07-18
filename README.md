# KoalaData - Extension Metrics Platform

KoalaData is a self-hosted open-analytics platform for browser-extension developers. Track active users, installations, uninstalls, store page views, and impressions with custom dashboard widgets and growth leaderboards.

---

## 1. Quick Start & Docker Compose Deployment

KoalaData uses a multi-stage Docker build and runs as a lightweight Node service. To deploy:

1. Clone the repository and navigate into it.
2. Build and start the container using Docker Compose:
   ```bash
   docker compose up -d --build
   ```
3. The application will initialize, run database migrations, seed the first admin account, and start listening on port `3000`.

---

## 2. First-Admin Setup & Seeding

On initial startup, if the database is unseeded, KoalaData automatically seeds:
- An administrator account:
  - **Username**: `admin`
  - **Password**: `admin_password`
- Default system settings (e.g. registration policy set to `approval_required`).

> [!IMPORTANT]
> Log in immediately to the admin console using the default credentials (`admin` / `admin_password`) and navigate to **Profile Settings -> Security** to change your password. The system will display a warning banner until this is done.

---

## 3. Caddy Reverse Proxy & HTTPS Setup

To deploy KoalaData behind a Caddy reverse proxy with automated Let's Encrypt SSL certificates:

1. Ensure port `3000` is mapped on localhost.
2. Configure your `Caddyfile` on the host machine:
   ```caddyfile
   koaladata.yourdomain.com {
       reverse_proxy localhost:3000
   }
   ```
3. Update the `ORIGIN` environment variable in your `docker-compose.yml` to prevent SvelteKit CSRF checks from blocking forms:
   ```yaml
   environment:
     - ORIGIN=https://koaladata.yourdomain.com
   ```
4. Restart Caddy:
   ```bash
   caddy reload --config /etc/caddy/Caddyfile
   ```

---

## 4. Storage Volumes & Paths

Data is persisted on the host machine below two main directories:
- **Database and Uploads Volume** (`/data` mapped to `koaladata_data` volume):
  - `/data/data.db` - SQLite production database.
  - `/data/project-assets/` - Uploaded extension branding logos.
  - `/data/uploads/` - Saved CSV import files.
- **Automated Backups Volume** (`/backups` mapped to `./backups` host folder):
  - Contains scheduled backup snapshots of the SQLite database.

---

## 5. Automated Backups & Restoration

KoalaData includes a native Node script that performs online SQLite database backups without needing the `sqlite3` CLI client installed in the runtime.

### Trigger a Backup
Run the backup script inside the active container:
```bash
docker compose exec app node scripts/backup.js
```
This saves a copy of the database named `backup-[timestamp].db` to the host's `./backups/` directory and prunes backups older than 7 days.

### Restore a Backup
To restore a database snapshot:
1. Stop the container:
   ```bash
   docker compose down
   ```
2. Copy the chosen backup file from `./backups/backup-[timestamp].db` over `/data/data.db` (usually located in `/var/lib/docker/volumes/...` or your mapped data mount).
3. Restart the container:
   ```bash
   docker compose up -d
   ```

---

## 6. Updates & Migrations

To apply software updates and database schema migrations:
1. Pull the latest commits from the repository:
   ```bash
   git pull origin main
   ```
2. Rebuild and restart the container:
   ```bash
   docker compose up -d --build
   ```
3. The container's startup scripts automatically run migrations (via Drizzle Kit) on startup before booting the server process.

---

## 7. Chrome CSV Compatibility Limitations
The automated header mapper matches standard columns (e.g. WAU, installs) for default Chrome Web Store Developer Console exports. Custom headers or altered spreadsheet structures can be manually mapped using the generic dropdown wizard during the upload confirmation step.
