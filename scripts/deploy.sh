#!/bin/bash
set -ex

# Load environment variables
source scripts/load-env.sh

# Build and start services
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build 