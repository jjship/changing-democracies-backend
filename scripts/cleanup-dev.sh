#!/bin/sh

echo "Cleaning up development environment..."

# Bring down containers but preserve the volume
docker compose down --volumes=false

# Remove unused images and networks
docker image prune -f
docker network prune -f
