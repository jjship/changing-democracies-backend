#!/bin/bash
set -e

echo "Docker disk usage:"
docker system df

echo "Starting Docker cleanup..."

docker container prune -f
docker image prune -a --force --filter "until=24h"
docker volume prune -f
docker network prune -f

echo "Finished Docker cleanup"

echo "Docker disk usage:"
docker system df