.PHONY: help setup frontend dev test lint build apk

JAVA_HOME ?= $(HOME)/dev/jdk-21
ANDROID_HOME ?= $(HOME)/dev/android-sdk

help:
	@echo "make setup     install the frontend dependencies"
	@echo "make frontend  start the frontend on :5173"
	@echo "make dev       same as make frontend"
	@echo "make test      run the tests"
	@echo "make lint      lint the frontend"
	@echo "make build     build the frontend"
	@echo "make apk       build the debug APK (frontend/android/app/build/outputs/apk/debug)"

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
