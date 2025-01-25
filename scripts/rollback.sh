#!/bin/bash
set -eo pipefail

# Check if commit hash is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <commit-hash>"
    exit 1
fi

ROLLBACK_COMMIT="$1"

# Revert to specified commit
git reset --hard "$ROLLBACK_COMMIT"

# Stop current containers
docker compose down

# Rebuild and restart
./scripts/deploy.sh

# Verify health
sleep 10
curl -sSf http://localhost:8083/health || {
    echo "Rollback health check failed"
    exit 1
}

echo "Rollback completed successfully" 