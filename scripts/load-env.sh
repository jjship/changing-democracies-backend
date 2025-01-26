#!/bin/bash

# Exit on error
set -e

# Check if .env exists
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    exit 1
fi

# Turn on auto-export of variables
set -a

# Load the .env file
source .env

# Turn off auto-export
set +a