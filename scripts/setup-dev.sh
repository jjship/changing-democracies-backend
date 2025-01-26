#!/bin/sh

DB_VOLUME="cd_admin-db_data"

if ! docker volume ls | grep -q $DB_VOLUME; then
	docker volume create --name $DB_VOLUME
fi

# Bring down existing containers while preserving the volume
docker compose down --volumes=false

# Start the development environment
docker compose up --build
