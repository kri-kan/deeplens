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
    echo "Usage: ./deploy.sh [identity-api | search-api | worker-service | reasoning-api | whatsapp-processor]"
    exit 1
fi

# Configuration Mapping
case $SERVICE_NAME in
    "identity-api")
        PROJECT_PATH="src/NextGen.Identity/NextGen.Identity.Api/NextGen.Identity.Api.csproj"
        HOSTING_PATH="/data/hosting/identity"
        COMPOSE_SERVICE="identity-api"
        COMPOSE_DIR="setupscripts/application/services"
        ;;
    "search-api")
        PROJECT_PATH="src/DeepLens.Service/DeepLens.SearchApi/DeepLens.SearchApi.csproj"
        HOSTING_PATH="/data/hosting/deeplensapi"
        COMPOSE_SERVICE="search-api"
        COMPOSE_DIR="setupscripts/application/services"
        ;;
    "worker-service")
        PROJECT_PATH="src/DeepLens.Service/DeepLens.WorkerService/DeepLens.WorkerService.csproj"
        HOSTING_PATH="/data/hosting/deeplensworkerservice"
        COMPOSE_SERVICE="worker-service"
        COMPOSE_DIR="setupscripts/application/services"
        ;;
    "whatsapp-processor")
        PROJECT_PATH="src/whatsapp-processor"
        HOSTING_PATH="/data/hosting/whatsapp"
        COMPOSE_SERVICE="whatsapp-processor"
        COMPOSE_DIR="setupscripts/application/whatsapp"
        ;;
    "reasoning-api")
        PROJECT_PATH="src/DeepLens.ReasoningService"
        HOSTING_PATH="/data/hosting/reasoning-api"
        COMPOSE_SERVICE="reasoning-api"
        COMPOSE_DIR="setupscripts/application"
        ;;
    *)
        echo -e "${RED}Error: Unknown service '$SERVICE_NAME'${NC}"
        exit 1
        ;;
esac

echo -e "${CYAN}🚀 Starting deployment for ${YELLOW}$SERVICE_NAME${NC}..."

# 1. Build and Publish
if [ "$SERVICE_NAME" == "whatsapp-processor" ]; then
    echo -e "${CYAN}📦 Building Node application...${NC}"
    cd "$PROJECT_PATH" || exit 1
    npm install
    npm run build:all
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Build failed. Deployment aborted.${NC}"
        exit 1
    fi
    cd - > /dev/null

    echo -e "${CYAN}📂 Deploying binaries to $HOSTING_PATH...${NC}"
    mkdir -p "$HOSTING_PATH"
    rm -rf "$HOSTING_PATH/dist" "$HOSTING_PATH/public"
    cp -r "$PROJECT_PATH/dist" "$HOSTING_PATH/"
    cp -r "$PROJECT_PATH/public" "$HOSTING_PATH/"
    cp "$PROJECT_PATH/package.json" "$HOSTING_PATH/"
    cp "$PROJECT_PATH/package-lock.json" "$HOSTING_PATH/"

    echo -e "${CYAN}📦 Installing production dependencies in hosting path...${NC}"
    cd "$HOSTING_PATH" || exit 1
    npm install --omit=dev
    cd - > /dev/null
elif [ "$SERVICE_NAME" == "reasoning-api" ]; then
    echo -e "${CYAN}📂 Copying Python source files to $HOSTING_PATH...${NC}"
    mkdir -p "$HOSTING_PATH"
    cp -r "$PROJECT_PATH"/* "$HOSTING_PATH/"
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ File copy failed. Check permissions.${NC}"
        exit 1
    fi
else
    echo -e "${CYAN}📦 Building and publishing project...${NC}"
    dotnet publish "$PROJECT_PATH" -c Release -o "./publish/$SERVICE_NAME"

    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Build failed. Deployment aborted.${NC}"
        exit 1
    fi

    # 2. Deploy to hosting path
    echo -e "${CYAN}📂 Deploying binaries to $HOSTING_PATH...${NC}"
    mkdir -p "$HOSTING_PATH"
    cp -r ./publish/"$SERVICE_NAME"/* "$HOSTING_PATH/"

    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ File copy failed. Check permissions.${NC}"
        exit 1
    fi
fi

# 3. Restart Container
echo -e "${CYAN}🔄 Restarting container ${YELLOW}$COMPOSE_SERVICE${NC}..."
cd "$COMPOSE_DIR" && docker compose restart "$COMPOSE_SERVICE"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Container restart failed.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Deployment successful for $SERVICE_NAME!${NC}"
