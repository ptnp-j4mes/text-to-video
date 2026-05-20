#!/usr/bin/env bash
set -euo pipefail

python -m uvicorn services.api.app.main:app --host 127.0.0.1 --port 5432 --reload
