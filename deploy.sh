#!/usr/bin/env bash
# Run this ON your Hetzner server to deploy / update.
# Usage: ./deploy.sh
set -e

echo "==> Pulling latest code..."
git pull origin main

echo "==> Rebuilding and restarting containers..."
docker compose pull db  # ensure latest postgres image
docker compose up --build -d

echo "==> Done. API is reachable at http://$(curl -s ifconfig.me):80"
