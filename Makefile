.PHONY: dev-web dev-api dev-worker dev-all

dev-web:
	npm --prefix apps/web run dev

dev-api:
	python -m uvicorn services.api.app.main:app --host 127.0.0.1 --port 5432 --reload

dev-worker:
	python services/worker/worker.py

dev-all:
	bash scripts/run_all.sh

