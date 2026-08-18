#!/bin/sh
set -eu

if [ "${CONFIRM_RESTORE:-}" != "YES" ]; then
  echo "restore: refusing to run. Set CONFIRM_RESTORE=YES after stopping the NavoPass web container." >&2
  exit 2
fi

backup_dir="${1:-}"
if [ -z "$backup_dir" ] || [ ! -d "$backup_dir" ]; then
  echo "usage: CONFIRM_RESTORE=YES /scripts/restore-backup.sh /backups/YYYYMMDDTHHMMSSZ" >&2
  exit 2
fi

DB_HOST_VALUE="${DB_HOST:-db}"
DB_PORT_VALUE="${DB_PORT:-5432}"
DB_NAME_VALUE="${DB_NAME:-navopass}"
DB_USER_VALUE="${DB_USER:-navopass}"
UPLOAD_SOURCE="${UPLOAD_SOURCE:-/source/uploads}"

if [ -z "${DB_PASSWORD:-}" ]; then
  echo "restore: DB_PASSWORD is required" >&2
  exit 1
fi

for required in database.dump uploads.tar.gz SHA256SUMS; do
  [ -f "$backup_dir/$required" ] || { echo "restore: missing $required" >&2; exit 1; }
done

(
  cd "$backup_dir"
  sha256sum -c SHA256SUMS
)

export PGPASSWORD="$DB_PASSWORD"
echo "restore: restoring PostgreSQL database from $backup_dir/database.dump"
pg_restore \
  -h "$DB_HOST_VALUE" \
  -p "$DB_PORT_VALUE" \
  -U "$DB_USER_VALUE" \
  -d "$DB_NAME_VALUE" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  "$backup_dir/database.dump"

echo "restore: replacing upload volume"
mkdir -p "$UPLOAD_SOURCE"
find "$UPLOAD_SOURCE" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
tar -xzf "$backup_dir/uploads.tar.gz" -C "$UPLOAD_SOURCE"

echo "restore: completed. Start the NavoPass web container and verify /api/health."
