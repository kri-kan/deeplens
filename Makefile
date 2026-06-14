.PHONY: deploy-identity-api deploy-search-api deploy-worker-service deploy-whatsapp-processor

deploy-identity-api:
	./infrastructure/deploy.sh identity-api

deploy-search-api:
	./infrastructure/deploy.sh search-api

deploy-worker-service:
	./infrastructure/deploy.sh worker-service

deploy-whatsapp-processor:
	./infrastructure/deploy.sh whatsapp-processor
