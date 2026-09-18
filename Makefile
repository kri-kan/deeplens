.PHONY: deploy-identity-api deploy-search-api deploy-worker-service deploy-whatsapp-processor deploy-reasoning-api deploy-store-api build-admin-apk build-vayyari-admin-apk admin-apk build-admin-debug-apk admin-debug-apk admin-apk-debug admin-apk-both build-vayyari-apk publish-apk vayyari-apk vayyari-admin-apk build-store-app publish-store-app store-app vayyari-store build-store-apk store-apk build-store-debug-apk store-debug-apk store-apk-debug store-apk-both push-admin-ota push-store-ota push-all-ota test test-dotnet test-ts

deploy-identity-api:
	./infrastructure/deploy.sh identity-api

deploy-search-api:
	./infrastructure/deploy.sh search-api

deploy-worker-service:
	./infrastructure/deploy.sh worker-service

deploy-whatsapp-processor:
	./infrastructure/deploy.sh whatsapp-processor

deploy-reasoning-api:
	./infrastructure/deploy.sh reasoning-api

deploy-store-api:
	./infrastructure/deploy.sh store-api

# Vayyari Admin APK targets (publishes to publish/admin-app/)
build-admin-apk:
	./infrastructure/deploy.sh admin-apk

build-vayyari-admin-apk: build-admin-apk

admin-apk: build-admin-apk

build-vayyari-apk: build-admin-apk

publish-apk: build-admin-apk

vayyari-apk: build-admin-apk

vayyari-admin-apk: build-admin-apk

build-admin-debug-apk:
	./infrastructure/deploy.sh admin-apk-debug

admin-debug-apk: build-admin-debug-apk

admin-apk-debug: build-admin-debug-apk

admin-apk-both:
	./infrastructure/deploy.sh admin-apk-both

# Vayyari Store Web App targets (publishes to publish/vayyari/)
build-store-app:
	./infrastructure/deploy.sh store-app

publish-store-app: build-store-app

store-app: build-store-app

vayyari-store: build-store-app

# Vayyari Store Android APK targets (publishes to publish/vayyari/)
build-store-apk:
	./infrastructure/deploy.sh store-apk

store-apk: build-store-apk

build-store-debug-apk:
	./infrastructure/deploy.sh store-apk-debug

store-debug-apk: build-store-debug-apk

store-apk-debug: build-store-debug-apk

store-apk-both:
	./infrastructure/deploy.sh store-apk-both

test: test-dotnet test-ts

test-dotnet:
	dotnet test tests/Store.Api.Tests/Store.Api.Tests.csproj --no-restore

test-ts:
	cd src/vayyari && npm test

# Mobile Over-The-Air (OTA) Push Targets
push-admin-ota:
	./infrastructure/deploy.sh vayyari-ota

push-store-ota:
	./infrastructure/deploy.sh store-ota

push-all-ota: push-admin-ota push-store-ota
