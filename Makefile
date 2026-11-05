.PHONY: help setup frontend dev test lint build

help:
	@echo "make setup     installa le dipendenze del frontend"
	@echo "make frontend  avvia il frontend su :5173"
	@echo "make dev       come make frontend"
	@echo "make test      esegue i test"
	@echo "make lint      lint del frontend"
	@echo "make build     build del frontend"

setup:
	cd frontend && npm install

frontend:
	cd frontend && npm run dev

dev: frontend

test:
	cd frontend && npm test

lint:
	cd frontend && npm run lint

build:
	cd frontend && npm run build
