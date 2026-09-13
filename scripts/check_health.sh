#!/usr/bin/env bash
set -euo pipefail
BASE=${1:-http://localhost:8080}
echo "Checking health at $BASE/api/v1/health"
curl -sS "$BASE/api/v1/health" | jq .

