#!/bin/sh
set -eu

BACKUP_ROOT="${BACKUP_ROOT:-/backups}"
UPLOAD_SOURCE="${UPLOAD_SOURCE:-/source/uploads}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
DB_HOST_VALUE="${DB_HOST:-db}"
DB_PORT_VALUE="${DB_PORT:-5432}"
DB_NAME_VALUE="${DB_NAME:-navopass}"
DB_USER_VALUE="${DB_USER:-navopass}"

if [ -z "${DB_PASSWORD:-}" ]; then
  echo "backup: DB_PASSWORD is required" >&2
  exit 1
fi

export PGPASSWORD="$DB_PASSWORD"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
tmp_dir="$BACKUP_ROOT/.tmp-$stamp-$$"
final_dir="$BACKUP_ROOT/$stamp"

mkdir -p "$BACKUP_ROOT" "$tmp_dir"
cleanup() { rm -rf "$tmp_dir"; }
trap cleanup EXIT INT TERM

echo "backup: creating PostgreSQL dump $stamp"
pg_dump \
  -h "$DB_HOST_VALUE" \
  -p "$DB_PORT_VALUE" \
  -U "$DB_USER_VALUE" \
  -d "$DB_NAME_VALUE" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="$tmp_dir/database.dump"

echo "backup: archiving uploads"
mkdir -p "$UPLOAD_SOURCE"
tar -czf "$tmp_dir/uploads.tar.gz" -C "$UPLOAD_SOURCE" .

cat > "$tmp_dir/metadata.txt" <<EOF
service=navopass
created_utc=$stamp
database=$DB_NAME_VALUE
retention_days=$RETENTION_DAYS
EOF

(
  cd "$tmp_dir"
  sha256sum database.dump uploads.tar.gz metadata.txt > SHA256SUMS
)

mv "$tmp_dir" "$final_dir"
trap - EXIT INT TERM
ln -sfn "$stamp" "$BACKUP_ROOT/latest"

find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -name '20*' -mtime "+$RETENTION_DAYS" -exec rm -rf {} +

echo "backup: completed $final_dir"
