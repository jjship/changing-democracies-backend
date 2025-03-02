#!/bin/bash
set -e

# Store the original directory
ORIGINAL_DIR=$(pwd)

# Free up memory before starting
echo "Freeing up system caches..."
sync
# Use sudo if available, otherwise skip with a message
if command -v sudo >/dev/null 2>&1; then
  sudo sh -c "echo 1 > /proc/sys/vm/drop_caches" 2>/dev/null || echo "Warning: Could not clear caches (requires root)"
else
  echo "Warning: sudo not available, skipping cache clearing"
fi

# Remove unused Docker resources to free up memory
echo "Cleaning up unused Docker resources..."
docker system prune -f 2>/dev/null || true

# Set memory limits based on 2GB total VM memory
export BACKEND_MEMORY_LIMIT=1024m  # 1GB for backend
export CMS_MEMORY_LIMIT=512m       # 512MB for CMS

# Inform about memory configuration
echo "Memory limits: Backend=${BACKEND_MEMORY_LIMIT}, CMS=${CMS_MEMORY_LIMIT}"

DB_VOLUME="cd_admin-db_data"

if ! docker volume ls | grep -q $DB_VOLUME; then
  docker volume create --name $DB_VOLUME

  docker run --rm \
  --memory=128m \
  -v $DB_VOLUME:/data \
  alpine sh -c 'chown -R 1000:1000 /data'
fi

# Perform backup if possible
echo "==================== BACKUP PROCESS STARTING ===================="
BACKUP_DIR="/opt/cd_admin/backups"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_SUCCEEDED=false

# First check if there are any containers (running or stopped)
CONTAINER_NAME=$(docker ps -a --format "{{.Names}}" | grep cd_backend)

if [ -z "$CONTAINER_NAME" ]; then
  echo "No cd_backend container found (running or stopped) - likely after VM reboot or first deployment"
  echo "Will attempt to backup directly from volumes instead"
else
  echo "Found container: $CONTAINER_NAME"
  
  # Check if the container is running
  CONTAINER_RUNNING=$(docker ps --format "{{.Names}}" | grep cd_backend)
  
  # If the container is running, stop it first
  if [ ! -z "$CONTAINER_RUNNING" ]; then
    echo "Container is running. Stopping container to ensure database consistency"
    if ! docker stop $CONTAINER_NAME; then
      echo "Failed to stop container, will attempt alternative backup method"
    fi
  else
    echo "Container is not running. Will attempt to copy data anyway."
  fi

  # Try to copy from the container (running or not)
  # Create temp directory
  TEMP_DIR=$(mktemp -d)
  
  # Copy the database files and check for errors
  if ! docker cp $CONTAINER_NAME:/cd_backend/data/. "$TEMP_DIR/" 2>/dev/null; then
    echo "Failed to copy database from container - will try volume backup"
    rm -rf "$TEMP_DIR"
  else
    # Verify files were copied and not empty
    if [ ! -f "$TEMP_DIR/database.sqlite" ]; then
      echo "Database file not found in copied files - will try volume backup"
      ls -la "$TEMP_DIR"
      rm -rf "$TEMP_DIR"
    else
      # Create the backup with reduced compression level for lower memory usage
      echo "Creating compressed backup (optimized for low memory)..."
      tar -cf - -C "$TEMP_DIR" . | gzip -1 > "$BACKUP_DIR/db_backup_$TIMESTAMP.tar.gz"
      
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
        BACKUP_SUCCEEDED=true
        
        # Cleanup old backups - keep only the 10 most recent
        pushd $BACKUP_DIR > /dev/null
        ls -t db_backup_*.tar.gz 2>/dev/null | tail -n +11 | xargs -r rm --
        popd > /dev/null
      fi
    fi
  fi
  
  # No need to restart container since we're going to destroy it anyway
fi

# If backup from container failed, try direct volume access as a fallback
if [ "$BACKUP_SUCCEEDED" = false ] && docker volume ls | grep -q $DB_VOLUME; then
  echo "Attempting backup directly from Docker volume: $DB_VOLUME"
  
  # Create a temporary container to access the volume
  TEMP_DIR=$(mktemp -d)
  
  # Mount the volume and copy data with memory limits
  if ! docker run --rm --memory=256m -v $DB_VOLUME:/dbdata -v $TEMP_DIR:/backup alpine sh -c "cp -r /dbdata/. /backup/ 2>/dev/null"; then
    echo "Failed to copy data from volume"
    rm -rf "$TEMP_DIR"
  else
    # Check if we got the database file
    if [ ! -f "$TEMP_DIR/database.sqlite" ]; then
      echo "Database file not found in volume data"
      ls -la "$TEMP_DIR"
      rm -rf "$TEMP_DIR"
    else
      echo "Successfully extracted database from volume"
      
      # Create the backup with lower compression for reduced memory usage
      echo "Creating compressed backup from volume data (optimized for low memory)..."
      tar -cf - -C "$TEMP_DIR" . | gzip -1 > "$BACKUP_DIR/db_backup_$TIMESTAMP.tar.gz"
      
      # Clean up temp directory
      echo "Cleaning up temporary files..."
      rm -rf "$TEMP_DIR"
      
      # Verify backup size and report
      if [ ! -s "$BACKUP_DIR/db_backup_$TIMESTAMP.tar.gz" ]; then
        echo "Error: Backup file is empty"
        rm -f "$BACKUP_DIR/db_backup_$TIMESTAMP.tar.gz"
      else
        BACKUP_SIZE=$(ls -lh "$BACKUP_DIR/db_backup_$TIMESTAMP.tar.gz" | awk "{ print \$5 }")
        echo "Backup from volume created successfully: db_backup_$TIMESTAMP.tar.gz (Size: $BACKUP_SIZE)"
        
        # Cleanup old backups - keep only the 10 most recent
        pushd $BACKUP_DIR > /dev/null
        ls -t db_backup_*.tar.gz 2>/dev/null | tail -n +11 | xargs -r rm --
        popd > /dev/null
      fi
    fi
  fi
fi

echo "==================== BACKUP PROCESS COMPLETE ===================="

# Free up memory before intensive docker operations
echo "Clearing caches before container operations..."
sync
# Use sudo if available, otherwise skip with a message
if command -v sudo >/dev/null 2>&1; then
  sudo sh -c "echo 1 > /proc/sys/vm/drop_caches" 2>/dev/null || echo "Warning: Could not clear caches (requires root)"
else
  echo "Warning: sudo not available, skipping cache clearing"
fi

# Make sure we're in the right directory
cd "$ORIGINAL_DIR"

# Ensure docker-compose.prod.yml exists before trying to use it
if [ ! -f "docker-compose.prod.yml" ]; then
  echo "Error: docker-compose.prod.yml not found in current directory"
  echo "Current directory: $(pwd)"
  echo "Directory contents:"
  ls -la
  exit 1
fi

# Now shutdown existing containers for the new deployment
echo "Shutting down existing containers..."
docker compose -f docker-compose.prod.yml down --volumes=false

# Wait a moment for memory to stabilize
sleep 5

# Free memory again after stopping containers
echo "Clearing caches before build..."
sync
# Use sudo if available, otherwise skip with a message
if command -v sudo >/dev/null 2>&1; then
  sudo sh -c "echo 1 > /proc/sys/vm/drop_caches" 2>/dev/null || echo "Warning: Could not clear caches (requires root)"
else
  echo "Warning: sudo not available, skipping cache clearing"
fi

# Continue with the deployment
if [ -f "scripts/load-env.sh" ]; then
  source scripts/load-env.sh
else
  echo "Warning: scripts/load-env.sh not found, continuing anyway"
fi

# Create a memory-optimized override file for docker-compose
# Using version 3.7 for better compatibility
cat > docker-compose.memory.yml << EOF
version: '3.7'

services:
  cd_backend:
    mem_limit: ${BACKEND_MEMORY_LIMIT}
    environment:
      NODE_OPTIONS: "--max-old-space-size=800"  # Limit Node.js heap size
      
  cd_cms:
    mem_limit: ${CMS_MEMORY_LIMIT}
EOF

# Use memory-limited build
echo "Building with memory limits for 2GB VM..."
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Build one service at a time to reduce memory pressure
for service in cd_backend cd_cms; do
  echo "Building service: $service"
  docker compose -f docker-compose.prod.yml build --no-cache $service
  
  # Free memory between builds
  sync
  # Use sudo if available, otherwise skip with a message
  if command -v sudo >/dev/null 2>&1; then
    sudo sh -c "echo 1 > /proc/sys/vm/drop_caches" 2>/dev/null || echo "Warning: Could not clear caches (requires root)"
  else
    echo "Warning: sudo not available, skipping cache clearing"
  fi
done

# Free memory one last time before starting containers
echo "Final memory cleanup before starting containers..."
sync
# Use sudo if available, otherwise skip with a message
if command -v sudo >/dev/null 2>&1; then
  sudo sh -c "echo 1 > /proc/sys/vm/drop_caches" 2>/dev/null || echo "Warning: Could not clear caches (requires root)"
else
  echo "Warning: sudo not available, skipping cache clearing"
fi

# Start containers with memory limits
echo "Starting containers with memory limits..."
# Start one container at a time with memory limits
docker compose -f docker-compose.prod.yml -f docker-compose.memory.yml up -d cd_backend
sleep 5
docker compose -f docker-compose.prod.yml -f docker-compose.memory.yml up -d cd_cms

echo "Deployment complete with memory-optimized settings"
