#!/bin/bash
set -e

# Load environment variables
source scripts/load-env.sh

# Build and restart containers
docker compose -f docker-compose.yml -f docker-compose.prod.yml build

# Run npm install and build in the backend container
docker compose run --rm cd_backend npm install
docker compose run --rm cd_backend npm run build

# Start the services
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d 