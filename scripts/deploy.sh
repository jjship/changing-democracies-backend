#!/bin/bash
set -euo pipefail

source scripts/load-env.sh

docker compose -f docker-compose.scaleway.yml down --remove-orphans
docker compose -f docker-compose.scaleway.yml build --no-cache
docker compose -f docker-compose.scaleway.yml up -d
