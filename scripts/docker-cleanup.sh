#!/bin/bash
set -e

echo "Starting Docker cleanup..."

docker container prune -f
docker image prune -a --force --filter "until=24h"
docker volume prune -f --filter "label!=keep=true"
docker network prune -f

echo "Finished Docker cleanup"