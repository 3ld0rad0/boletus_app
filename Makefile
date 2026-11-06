.PHONY: help setup frontend dev test lint build apk

JAVA_HOME ?= $(HOME)/dev/jdk-21
ANDROID_HOME ?= $(HOME)/dev/android-sdk

help:
	@echo "make setup     installa le dipendenze del frontend"
	@echo "make frontend  avvia il frontend su :5173"
	@echo "make dev       come make frontend"
	@echo "make test      esegue i test"
	@echo "make lint      lint del frontend"
	@echo "make build     build del frontend"
	@echo "make apk       build APK debug (frontend/android/app/build/outputs/apk/debug)"

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

apk:
	cd frontend && npm run cap:sync && echo "sdk.dir=$(ANDROID_HOME)" > android/local.properties && cd android && JAVA_HOME=$(JAVA_HOME) ANDROID_HOME=$(ANDROID_HOME) ./gradlew assembleDebug
