#!/usr/bin/env bash
set -Eeuo pipefail
cd /opt/stacks/maps-site-generator
exec 9>.deploy.lock
flock -w 300 9
image=${1:?Informe a imagem com digest}
[[ "$image" =~ ^ghcr\.io/virtualizzeai/maps-site-generator-backend@sha256:[a-f0-9]{64}$ ]] || exit 2
test -s backend.env
previous=$(cat image.lock 2>/dev/null || true)
export BACKEND_IMAGE="$image"
docker compose -f compose.yaml pull backend
if docker compose -f compose.yaml up -d --wait --wait-timeout 180 backend; then
  printf '%s\n' "$image" > image.lock
else
  if [[ -n "$previous" ]]; then
    export BACKEND_IMAGE="$previous"
    docker compose -f compose.yaml up -d --wait --wait-timeout 180 backend
  else
    docker compose -f compose.yaml stop backend
  fi
  exit 1
fi
