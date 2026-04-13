#!/bin/bash
set -euo pipefail

# Symlink .env from persistent location if not present
if [ ! -f .env ] && [ -f /opt/cd_admin.env ]; then
  ln -sf /opt/cd_admin.env .env
fi

source scripts/load-env.sh

docker compose -f docker-compose.scaleway.yml down --remove-orphans
docker compose -f docker-compose.scaleway.yml build --no-cache
docker compose -f docker-compose.scaleway.yml up -d
