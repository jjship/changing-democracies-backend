#!/bin/bash
set -e

# Load environment variables
source scripts/load-env.sh

# Force rebuild images
docker compose -f docker-compose.prod.yml build --no-cache

# Start services
docker compose -f docker-compose.prod.yml up -d