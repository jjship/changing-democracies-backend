#!/bin/bash
set -e

echo "Starting Docker cleanup..."

docker container prune -f
docker image prune -a --force --filter "until=24h"
docker volume ls -q | grep -v "cd_admin-db_data" | xargs -r docker volume rm
docker network prune -f

echo "Finished Docker cleanup"