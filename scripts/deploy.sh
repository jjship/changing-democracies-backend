#!/bin/bash
set -e

DB_VOLUME="cd_admin-db_data"

if ! docker volume ls | grep -q $DB_VOLUME; then
	docker volume create --name $DB_VOLUME
fi

docker compose -f docker-compose.prod.yml down --volumes=false

source scripts/load-env.sh

docker compose -f docker-compose.prod.yml build --no-cache

docker compose -f docker-compose.prod.yml up -d