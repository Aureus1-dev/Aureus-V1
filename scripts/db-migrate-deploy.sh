#!/usr/bin/env bash
# Production database migration deploy workflow (PD-002). Wraps
# `prisma migrate deploy` with the two safety steps a bare invocation
# skips: a pre-migration backup (so a bad migration is recoverable without
# an incident) and a post-migration status check (so a partially-applied
# migration is caught here, not discovered later at request time).
#
# Usage:
#   DATABASE_URL="postgresql://..." ./scripts/db-migrate-deploy.sh
#
# Set SKIP_BACKUP=yes to skip the pre-migration backup (e.g. CI against a
# disposable database, where a backup is pointless).
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${SKIP_BACKUP:-}" != "yes" ]]; then
  echo "Step 1/3: pre-migration backup"
  "$SCRIPT_DIR/db-backup.sh" "${BACKUP_DIR:-./backups}"
else
  echo "Step 1/3: pre-migration backup — skipped (SKIP_BACKUP=yes)"
fi

echo "Step 2/3: applying migrations"
npx prisma migrate deploy

echo "Step 3/3: verifying migration status"
npx prisma migrate status

echo "Migration deploy complete."
