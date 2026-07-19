#!/usr/bin/env bash
# Postgres backup (PD-002). Wraps pg_dump's custom format (-Fc): compressed,
# and restorable selectively (single table, schema-only, etc.) via
# pg_restore — plain-SQL dumps can only be replayed in full.
#
# Usage:
#   DATABASE_URL="postgresql://user:pass@host:port/db" ./scripts/db-backup.sh [output-dir]
#
# Writes <output-dir>/aureus-<UTC timestamp>.dump (default output-dir: ./backups).
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set." >&2
  exit 1
fi

OUTPUT_DIR="${1:-./backups}"
mkdir -p "$OUTPUT_DIR"

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUTPUT_FILE="$OUTPUT_DIR/aureus-${TIMESTAMP}.dump"

echo "Backing up $DATABASE_URL -> $OUTPUT_FILE"
pg_dump --format=custom --file="$OUTPUT_FILE" "$DATABASE_URL"

echo "Backup complete: $OUTPUT_FILE ($(du -h "$OUTPUT_FILE" | cut -f1))"
