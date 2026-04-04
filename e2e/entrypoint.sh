#!/bin/sh
set -e

MYSQL_HOST="${MYSQL_HOST:-localhost}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-password}"
MYSQL_DATABASE="${MYSQL_DATABASE:-sample}"

DB_URL="mysql://${MYSQL_USER}:${MYSQL_PASSWORD}@tcp(${MYSQL_HOST}:${MYSQL_PORT})/${MYSQL_DATABASE}"

# Step 1: Run migration
echo "Running migrations..."
migrate -path /app/db/migrate -database "$DB_URL" up
echo "Migrations completed."

# Step 2: Apply seed data
echo "Applying seed data..."
for f in /app/db/seed/*.sql; do
  echo "  Applying $f"
  mysql --ssl=0 --default-auth=mysql_native_password -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" < "$f"
done
echo "Seed data applied."

# Step 3: Start the API server
echo "Starting API server..."
exec /app/api
