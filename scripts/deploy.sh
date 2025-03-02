#!/bin/bash
set -e

DB_VOLUME="cd_admin-db_data"

if ! docker volume ls | grep -q $DB_VOLUME; then
  docker volume create --name $DB_VOLUME

	docker run --rm \
  -v $DB_VOLUME:/data \
  alpine sh -c 'chown -R 1000:1000 /data'
fi

# Shutdown existing containers but keep volumes
docker compose -f docker-compose.prod.yml down --volumes=false

# Perform backup while containers are down
echo "==================== BACKUP PROCESS STARTING ===================="
BACKUP_DIR="/opt/cd_admin/backups"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Get the container ID (even if stopped)
CONTAINER_NAME=$(docker ps -a --format "{{.Names}}" | grep cd_backend)

if [ -z "$CONTAINER_NAME" ]; then
  echo "Warning: cd_backend container not found, skipping backup"
else
  echo "Found container: $CONTAINER_NAME"
  
  # Create temp directory
  TEMP_DIR=$(mktemp -d)
  
  # Copy the database files and check for errors
  if ! docker cp $CONTAINER_NAME:/cd_backend/data/. "$TEMP_DIR/"; then
    echo "Failed to copy database from container - continuing without backup"
    rm -rf "$TEMP_DIR"
  else
    # Verify files were copied and not empty
    if [ ! -f "$TEMP_DIR/database.sqlite" ]; then
      echo "Database file not found in copied files - continuing without backup"
      ls -la "$TEMP_DIR"
      rm -rf "$TEMP_DIR"
    else
      # Create the backup
      echo "Creating compressed backup..."
      tar czf "$BACKUP_DIR/db_backup_$TIMESTAMP.tar.gz" -C "$TEMP_DIR" .
      
      # Clean up temp directory
      echo "Cleaning up temporary files..."
      rm -rf "$TEMP_DIR"
      
      # Verify backup size and report
      if [ ! -s "$BACKUP_DIR/db_backup_$TIMESTAMP.tar.gz" ]; then
        echo "Error: Backup file is empty"
        rm -f "$BACKUP_DIR/db_backup_$TIMESTAMP.tar.gz"
      else
        BACKUP_SIZE=$(ls -lh "$BACKUP_DIR/db_backup_$TIMESTAMP.tar.gz" | awk "{ print \$5 }")
        echo "Backup created successfully: db_backup_$TIMESTAMP.tar.gz (Size: $BACKUP_SIZE)"
        
        # Cleanup old backups - keep only the 10 most recent
        cd $BACKUP_DIR
        ls -t db_backup_*.tar.gz 2>/dev/null | tail -n +11 | xargs -r rm --
      fi
    fi
  fi
fi
echo "==================== BACKUP PROCESS COMPLETE ===================="

# Continue with the deployment
source scripts/load-env.sh

docker compose -f docker-compose.prod.yml build --no-cache

docker compose -f docker-compose.prod.yml up -d
