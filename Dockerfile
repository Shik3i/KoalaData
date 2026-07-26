# Stage 1: Build SvelteKit assets and compile production bundle
FROM node:26-alpine AS builder

WORKDIR /app

# Install build dependencies for compiling better-sqlite3 native C++ addon
RUN apk add --no-cache python3 make g++ gcc

COPY package*.json ./
RUN npm install --global npm@12.0.1 \
    && npm ci --ignore-scripts \
    && npm install-scripts approve better-sqlite3 esbuild --no-allow-scripts-pin \
    && npm rebuild better-sqlite3 esbuild

COPY . .
RUN npm run build
RUN npm prune --omit=dev --ignore-scripts

# Stage 2: Production runtime image
FROM node:26-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV DATA_DIRECTORY=/data
ENV DATABASE_PATH=/data/data.db
ENV BACKUP_DIRECTORY=/backups
ENV BODY_SIZE_LIMIT=64M

# Create persistence directories for database and operator-managed backups.
# su-exec lets the entrypoint repair bind-mount ownership as root, then drop
# privileges before starting the application.
RUN apk add --no-cache su-exec \
    && mkdir -p /data /backups \
    && chown -R node:node /data /backups

COPY --chown=node:node --from=builder /app/package*.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/build ./build
COPY --chown=node:node --from=builder /app/scripts ./scripts
COPY --chown=node:node --from=builder /app/migrations ./migrations
COPY --chown=node:node --from=builder /app/server.mjs ./server.mjs
COPY --chown=root:root docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod 0755 /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

CMD ["node", "server.mjs"]
