#!/usr/bin/env bash
# ==============================================================================
# Yapli AI - Automated Production Database & Workflow Backup
# ==============================================================================
# Creates an encrypted/compressed snapshot of:
#   1. PostgreSQL n8n database (all workflow definitions, executions, credentials)
#   2. n8n encryption key & configuration volume
#   3. Yapli AI client registries and configurations
# Rotates snapshots and keeps the last 7 days.
# ==============================================================================

set -e

BACKUP_DIR="${BACKUP_DIR:-/opt/yapli/backups}"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
TARGET_DIR="$BACKUP_DIR/backup_$TIMESTAMP"

mkdir -p "$TARGET_DIR"

echo "======================================================"
echo "📦 Starting Yapli AI Production Backup [$TIMESTAMP]"
echo "======================================================"

# 1. PostgreSQL Database Dump
echo "1. Exporting PostgreSQL database..."
POSTGRES_CONTAINER=$(docker ps --filter "name=postgres" --format "{{.ID}}" | head -n 1)

if [ -n "$POSTGRES_CONTAINER" ]; then
    docker exec "$POSTGRES_CONTAINER" pg_dump -U n8n_user n8n_db > "$TARGET_DIR/postgres_dump.sql"
    echo "   ✅ PostgreSQL exported successfully."
else
    echo "   ⚠️ Warning: Postgres container not found. Skipping SQL dump."
fi

# 2. n8n Volume Archive (Encryption Key & Custom Config)
echo "2. Archiving n8n volume data..."
N8N_VOLUME=$(docker volume ls --filter "name=n8n_data" --format "{{.Name}}" | head -n 1)
if [ -n "$N8N_VOLUME" ]; then
    docker run --rm -v "$N8N_VOLUME":/volume -v "$TARGET_DIR":/backup alpine \
        tar -czf /backup/n8n_volume.tar.gz -C /volume .
    echo "   ✅ n8n volume archived."
fi

# 3. Client Registries & Yapli Configurations
echo "3. Backing up client registry and JSON states..."
if [ -d "./clients" ]; then
    tar -czf "$TARGET_DIR/clients_backup.tar.gz" ./clients
    echo "   ✅ Clients registry archived."
fi

# 4. Bundle into single timestamped archive
echo "4. Compressing final archive..."
ARCHIVE_FILE="$BACKUP_DIR/yapli_backup_$TIMESTAMP.tar.gz"
tar -czf "$ARCHIVE_FILE" -C "$TARGET_DIR" .
rm -rf "$TARGET_DIR"

echo "   ✅ Backup saved to: $ARCHIVE_FILE ($(du -h "$ARCHIVE_FILE" | cut -f1))"

# 5. Clean up backups older than 7 days
echo "5. Rotating old archives (7-day retention)..."
find "$BACKUP_DIR" -type f -name "yapli_backup_*.tar.gz" -mtime +7 -exec rm -f {} +
echo "   ✅ Old backups pruned."

echo "======================================================"
echo "🎉 Backup Completed Successfully!"
echo "======================================================"
