# Stage 1: Build SvelteKit assets and compile production bundle
FROM node:26-alpine AS builder

WORKDIR /app

# Install build dependencies for compiling better-sqlite3 native C++ addon
RUN apk add --no-cache python3 make g++ gcc

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --production

# Stage 2: Production runtime image
FROM node:26-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV DATA_DIRECTORY=/data
ENV DATABASE_PATH=/data/data.db
ENV BACKUP_DIRECTORY=/backups

# Create persistence directories for database and automated backups
RUN mkdir -p /data /backups

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/migrations ./migrations

EXPOSE 3000

CMD ["node", "build/index.js"]
