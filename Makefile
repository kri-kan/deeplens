.PHONY: deploy-identity-api deploy-search-api deploy-worker-service deploy-whatsapp-processor deploy-reasoning-api build-vayyari-apk push-vayyari-ota deploy-vayyari-apk deploy-vayyari-ota

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

build-vayyari-apk:
	./infrastructure/deploy.sh vayyari-apk

deploy-vayyari-apk:
	./infrastructure/deploy.sh vayyari-apk

push-vayyari-ota:
	./infrastructure/deploy.sh vayyari-ota

deploy-vayyari-ota:
	./infrastructure/deploy.sh vayyari-ota
