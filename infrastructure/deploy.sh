#!/bin/bash

# --- DeepLens .NET Core Service Deployer ---
# Streamlines build, publish, and container restart for the 192.168.0.170 stack.

SERVICE_NAME=$1
NC='\033[0m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'

if [ -z "$SERVICE_NAME" ]; then
    echo -e "${RED}Error: Service name not specified.${NC}"
    echo "Usage: ./deploy.sh [identity-api | search-api | worker-service]"
    exit 1
fi

# Configuration Mapping
case $SERVICE_NAME in
    "identity-api")
        PROJECT_PATH="src/NextGen.Identity/NextGen.Identity.Api/NextGen.Identity.Api.csproj"
        HOSTING_PATH="/data/hosting/identity"
        COMPOSE_SERVICE="identity-api"
        ;;
    "search-api")
        PROJECT_PATH="src/DeepLens.Service/DeepLens.SearchApi/DeepLens.SearchApi.csproj"
        HOSTING_PATH="/data/hosting/deeplensapi"
        COMPOSE_SERVICE="search-api"
        ;;
    "worker-service")
        PROJECT_PATH="src/DeepLens.Service/DeepLens.WorkerService/DeepLens.WorkerService.csproj"
        HOSTING_PATH="/data/hosting/deeplensworkerservice"
        COMPOSE_SERVICE="worker-service"
        ;;
    *)
        echo -e "${RED}Error: Unknown service '$SERVICE_NAME'${NC}"
        exit 1
        ;;
esac

echo -e "${CYAN}🚀 Starting deployment for ${YELLOW}$SERVICE_NAME${NC}..."

# 1. Build and Publish
echo -e "${CYAN}📦 Building and publishing project...${NC}"
dotnet publish "$PROJECT_PATH" -c Release -o "./publish/$SERVICE_NAME"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed. Deployment aborted.${NC}"
    exit 1
fi

# 2. Deploy to hosting path
echo -e "${CYAN}📂 Deploying binaries to $HOSTING_PATH...${NC}"
cp -r ./publish/"$SERVICE_NAME"/* "$HOSTING_PATH/"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ File copy failed. Check permissions.${NC}"
    exit 1
fi

# 3. Restart Container
echo -e "${CYAN}🔄 Restarting container ${YELLOW}$COMPOSE_SERVICE${NC}..."
cd setupscripts/application/services && docker compose restart "$COMPOSE_SERVICE"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Container restart failed.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Deployment successful for $SERVICE_NAME!${NC}"
