#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env ]; then
  if [ -f .env.compose.example ]; then
    cp .env.compose.example .env
    echo ".env created from .env.compose.example — edit it to add real secrets (GEMINI_API_KEY)"
  else
    echo "Warning: .env not found and .env.compose.example missing. Create a .env before continuing." >&2
  fi
fi

echo "Building and starting containers..."
docker compose up --build -d

if [ "${1-}" != "--no-wait" ]; then
  echo -n "Waiting for backend to respond"
  for i in $(seq 1 120); do
    if curl -sSf http://localhost:8000/api/ >/dev/null 2>&1; then
      echo " - OK"
      break
    fi
    echo -n "."
    sleep 1
  done
fi

echo "Applying migrations..."
docker compose exec backend python manage.py migrate

echo "Collecting static files..."
docker compose exec backend python manage.py collectstatic --noinput

if [ "${CREATE_SUPERUSER-}" = "1" ]; then
  echo "Creating Django superuser (interactive)"
  docker compose exec backend python manage.py createsuperuser
fi

echo
echo "Done. Backend: http://localhost:8000 — Frontend: http://localhost:3000"
echo "Use 'docker compose logs -f' to follow logs and 'docker compose down' to stop the stack."
