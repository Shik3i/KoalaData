#!/bin/sh
set -eu

# Named volumes inherit image ownership, while bind mounts often arrive as
# root-owned paths. Repair only the persistence mounts before dropping to the
# application user; the server itself never runs as root.
mkdir -p /data /backups
chown -R node:node /data /backups

exec su-exec node:node "$@"
