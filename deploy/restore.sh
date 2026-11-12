#!/usr/bin/env bash
# ==============================================================================
# Yapli AI - Disaster Recovery & Restore Utility
# ==============================================================================
# Restores a full backup archive (PostgreSQL + n8n configs + client registries)
# Usage:
#   bash deploy/restore.sh /path/to/yapli_backup_YYYYMMDD_HHMMSS.tar.gz
# ==============================================================================

set -e

BACKUP_ARCHIVE="$1"

if [ -z "$BACKUP_ARCHIVE" ] || [ ! -f "$BACKUP_ARCHIVE" ]; then
    echo "❌ Error: Please specify a valid backup archive to restore."
    echo "Usage: bash deploy/restore.sh <path/to/yapli_backup_*.tar.gz>"
    exit 1
fi

TEMP_RESTORE_DIR="/tmp/yapli_restore_$(date +%s)"
mkdir -p "$TEMP_RESTORE_DIR"

echo "======================================================"
echo "🚨 Starting Yapli AI Disaster Recovery"
echo "   Archive: $BACKUP_ARCHIVE"
echo "======================================================"

echo "1. Unpacking archive..."
tar -xzf "$BACKUP_ARCHIVE" -C "$TEMP_RESTORE_DIR"

# 1. Restore PostgreSQL
if [ -f "$TEMP_RESTORE_DIR/postgres_dump.sql" ]; then
    echo "2. Restoring PostgreSQL database..."
    POSTGRES_CONTAINER=$(docker ps --filter "name=postgres" --format "{{.ID}}" | head -n 1)
    if [ -n "$POSTGRES_CONTAINER" ]; then
        docker exec -i "$POSTGRES_CONTAINER" psql -U n8n_user -d n8n_db < "$TEMP_RESTORE_DIR/postgres_dump.sql"
        echo "   ✅ PostgreSQL restored successfully."
    else
        echo "   ❌ Error: Postgres container is not running."
        exit 1
    fi
fi

# 2. Restore n8n Volume
if [ -f "$TEMP_RESTORE_DIR/n8n_volume.tar.gz" ]; then
    echo "3. Restoring n8n volume..."
    N8N_VOLUME=$(docker volume ls --filter "name=n8n_data" --format "{{.Name}}" | head -n 1)
    if [ -n "$N8N_VOLUME" ]; then
        docker run --rm -v "$N8N_VOLUME":/volume -v "$TEMP_RESTORE_DIR":/backup alpine \
            sh -c "rm -rf /volume/* && tar -xzf /backup/n8n_volume.tar.gz -C /volume"
        echo "   ✅ n8n volume restored."
    fi
fi

# 3. Restore Client Registries
if [ -f "$TEMP_RESTORE_DIR/clients_backup.tar.gz" ]; then
    echo "4. Restoring client registry..."
    tar -xzf "$TEMP_RESTORE_DIR/clients_backup.tar.gz" -C ./
    echo "   ✅ Client registry restored."
fi

# Clean up
rm -rf "$TEMP_RESTORE_DIR"

echo "5. Restarting n8n container to apply restored state..."
docker compose restart n8n

echo "======================================================"
echo "🎉 RESTORATION COMPLETED SUCCESSFULLY!"
echo "   All workflows, credentials, and client data are live."
echo "======================================================"
