#!/usr/bin/env bash
# Postgres restore (PD-002) — the counterpart to db-backup.sh. Restores a
# pg_dump custom-format (-Fc) dump into the target database via pg_restore.
#
# Usage:
#   DATABASE_URL="postgresql://user:pass@host:port/db" ./scripts/db-restore.sh <dump-file>
#
# DESTRUCTIVE: --clean drops existing objects before recreating them, so
# this overwrites whatever is currently in the target database. Requires
# explicit confirmation unless CONFIRM=yes is set (for non-interactive/CI
# use, e.g. a restore-drill job).
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set." >&2
  exit 1
fi

DUMP_FILE="${1:-}"
if [[ -z "$DUMP_FILE" || ! -f "$DUMP_FILE" ]]; then
  echo "Usage: DATABASE_URL=... ./scripts/db-restore.sh <dump-file>" >&2
  exit 1
fi

if [[ "${CONFIRM:-}" != "yes" ]]; then
  read -r -p "This will DROP and recreate objects in the target database from $DUMP_FILE. Type 'yes' to continue: " REPLY
  if [[ "$REPLY" != "yes" ]]; then
    echo "Aborted."
    exit 1
  fi
fi

echo "Restoring $DUMP_FILE -> $DATABASE_URL"
pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" "$DUMP_FILE"

echo "Restore complete."
