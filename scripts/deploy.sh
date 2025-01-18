#!/bin/bash
set -e

# Load environment variables
source scripts/load-env.sh

# Build and start containers
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build 