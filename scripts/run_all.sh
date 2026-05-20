#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ ! -d "$ROOT/.venv" ]; then
  echo "Missing .venv. Create it first with python3.11 -m venv .venv" >&2
  exit 1
fi

cleanup() {
  if [ -n "${API_PID:-}" ]; then kill "$API_PID" 2>/dev/null || true; fi
  if [ -n "${WORKER_PID:-}" ]; then kill "$WORKER_PID" 2>/dev/null || true; fi
  if [ -n "${WEB_PID:-}" ]; then kill "$WEB_PID" 2>/dev/null || true; fi
}

trap cleanup INT TERM EXIT

(
  cd "$ROOT"
  source .venv/bin/activate
  exec python -m uvicorn services.api.app.main:app --host 127.0.0.1 --port 5432 --reload
) &
API_PID=$!
echo "API  -> http://127.0.0.1:5432"

(
  cd "$ROOT"
  source .venv/bin/activate
  exec python services/worker/worker.py
) &
WORKER_PID=$!
echo "Worker started"

(
  cd "$ROOT/apps/web"
  exec npm run dev
) &
WEB_PID=$!
echo "Web  -> http://127.0.0.1:5431"

while true; do
  if ! kill -0 "$API_PID" 2>/dev/null; then
    wait "$API_PID" || true
    echo "API stopped"
    exit 1
  fi

  if ! kill -0 "$WORKER_PID" 2>/dev/null; then
    wait "$WORKER_PID" || true
    echo "Worker stopped"
    exit 1
  fi

  if ! kill -0 "$WEB_PID" 2>/dev/null; then
    wait "$WEB_PID" || true
    echo "Web stopped"
    exit 1
  fi

  sleep 1
done

