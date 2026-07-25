# Stage 1: Build SvelteKit assets and compile production bundle
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies for compiling better-sqlite3 native C++ addon
RUN apk add --no-cache python3 make g++ gcc

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --production

# Stage 2: Production runtime image
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV DATA_DIRECTORY=/data
ENV DATABASE_PATH=/data/data.db
ENV BACKUP_DIRECTORY=/backups
ENV BODY_SIZE_LIMIT=64M

# Create persistence directories for database and operator-managed backups
RUN mkdir -p /data /backups && chown -R node:node /data /backups

COPY --chown=node:node --from=builder /app/package*.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/build ./build
COPY --chown=node:node --from=builder /app/scripts ./scripts
COPY --chown=node:node --from=builder /app/migrations ./migrations
COPY --chown=node:node --from=builder /app/server.mjs ./server.mjs

EXPOSE 3000

USER node

CMD ["node", "server.mjs"]
