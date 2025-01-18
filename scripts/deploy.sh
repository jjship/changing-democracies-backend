#!/bin/bash
set -e

# Load environment variables
source scripts/load-env.sh

# Build and restart containers
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build 