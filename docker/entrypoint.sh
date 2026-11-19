#!/bin/sh
set -eu

cd /var/www/meridian

export MERIDIAN_DB_PATH="${MERIDIAN_DB_PATH:-/data/meridian.sqlite}"
export MERIDIAN_STORAGE_PATH="${MERIDIAN_STORAGE_PATH:-/data/storage}"

database_dir="$(dirname "$MERIDIAN_DB_PATH")"
mkdir -p "$database_dir" "$MERIDIAN_STORAGE_PATH"

# Apache runs as www-data. The database directory, the SQLite file, its WAL
# companions, uploads, and backups all have to be writable by that user.
chown -R www-data:www-data "$database_dir" "$MERIDIAN_STORAGE_PATH" 2>/dev/null || true

if [ "${MERIDIAN_ENV:-local}" = "production" ] && [ -z "${MERIDIAN_ADMIN_PASSWORD:-}" ]; then
    echo "[meridian] WARNING: MERIDIAN_ADMIN_PASSWORD is not set; the documented default temporary password will be used." >&2
fi

if [ "${MERIDIAN_AUTO_MIGRATE:-1}" != "0" ]; then
    echo "[meridian] applying migrations and seeders"
    php scripts/db.php setup
fi

# Migrations run as root and may recreate the database and WAL files.
chown -R www-data:www-data "$database_dir" "$MERIDIAN_STORAGE_PATH" 2>/dev/null || true

# Hosts such as Render inject PORT; Apache defaults to 80 elsewhere.
port="${PORT:-80}"
sed -ri "s/^Listen 80$/Listen ${port}/" /etc/apache2/ports.conf
sed -ri "s/<VirtualHost \*:80>/<VirtualHost *:${port}>/" /etc/apache2/sites-available/000-default.conf

exec "$@"
