#!/bin/sh
set -e

echo "Syncing Prisma database schema..."
npx prisma db push --skip-generate || echo "Database push notice: continuing..."

echo "Starting bot..."
exec node dist/index.js
