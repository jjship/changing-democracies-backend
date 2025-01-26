#!/bin/bash

echo "Starting Docker cleanup..."

run_cleanup_step() {
    local description=$1
    local command=$2
    
    if output=$(eval "$command" 2>&1); then
        echo "✓ $description completed successfully"
        if [ ! -z "$output" ]; then
            echo "$output"
        fi
    else
        echo "⚠️  Warning: $description had some issues, continuing anyway"
        if [ ! -z "$output" ]; then
            echo "$output"
        fi
    fi
    echo
}

run_cleanup_step "Container cleanup" "docker container prune -f"

run_cleanup_step "Image cleanup" "docker image prune -a --force --filter 'until=6h'"

run_cleanup_step "Volume cleanup" \
    "docker volume ls -q | grep -v 'cd_admin-db_data' | while read vol; do docker volume rm \$vol || echo \"Could not remove volume \$vol\"; done"

run_cleanup_step "Network cleanup" "docker network prune -f"

echo "Finished Docker cleanup"
