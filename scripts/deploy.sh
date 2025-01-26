#!/bin/bash
set -e

DB_VOLUME="cd_admin-db_data"

if ! docker volume ls | grep -q $DB_VOLUME; then
  docker volume create --name $DB_VOLUME

	docker run --rm \
  -v $DB_VOLUME:/data \
  alpine sh -c 'chown -R 1000:1000 /data'
fi



docker compose -f docker-compose.prod.yml down --volumes=false

source scripts/load-env.sh

docker compose -f docker-compose.prod.yml build --no-cache

docker compose -f docker-compose.prod.yml up -d
