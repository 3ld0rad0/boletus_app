.PHONY: help setup setup-backend setup-frontend backend frontend dev test test-backend test-frontend lint build

BACKEND_VENV := backend/.venv/bin

help:
	@echo "make setup     installa le dipendenze (backend + frontend)"
	@echo "make backend   avvia il backend su :8000"
	@echo "make frontend  avvia il frontend su :5173"
	@echo "make dev       avvia backend e frontend insieme"
	@echo "make test      esegue tutti i test"
	@echo "make lint      lint del frontend"
	@echo "make build     build del frontend"

setup: setup-backend setup-frontend

setup-backend:
	cd backend && python3 -m venv .venv
	cd backend && .venv/bin/pip install -e ".[dev]"
	cd backend && test -f .env || cp .env.example .env
	@echo "Ricorda di impostare JWT_SECRET in backend/.env"

setup-frontend:
	cd frontend && npm install

backend:
	cd backend && .venv/bin/uvicorn app.main:create_app --factory --reload

frontend:
	cd frontend && npm run dev

dev:
	$(MAKE) -j2 backend frontend

test: test-backend test-frontend

test-backend:
	cd backend && .venv/bin/pytest

test-frontend:
	cd frontend && npm test

lint:
	cd frontend && npm run lint

build:
	cd frontend && npm run build
