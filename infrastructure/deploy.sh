#!/bin/bash

# --- DeepLens .NET Core Service Deployer ---
# Streamlines build, publish, and container restart for the 192.168.0.170 stack.

SERVICE_NAME=$1
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
NC='\033[0m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'

if [ -z "$SERVICE_NAME" ]; then
    echo -e "${RED}Error: Service name not specified.${NC}"
    echo "Usage: ./deploy.sh [search-api | worker-service | store-api | reasoning-api | whatsapp-processor | store-app | store-apk | store-apk-debug | store-apk-both | admin-apk | admin-ota]"
    exit 1
fi

# Configuration Mapping
case $SERVICE_NAME in
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
    "store-api")
        PROJECT_PATH="src/services/Store.Api/Store.Api.csproj"
        HOSTING_PATH="/data/hosting/store-api"
        COMPOSE_SERVICE="store-api"
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
    "store-app"|"vayyari-store"|"store")
        PROJECT_PATH="src/store"
        HOSTING_PATH="publish/vayyari"
        COMPOSE_SERVICE="store-app"
        COMPOSE_DIR=""
        ;;
    "store-apk"|"store-apk-release"|"vayyari-store-apk")
        PROJECT_PATH="src/store"
        HOSTING_PATH="publish/vayyari"
        COMPOSE_SERVICE="store-apk"
        COMPOSE_DIR=""
        ;;
    "store-apk-debug")
        PROJECT_PATH="src/store"
        HOSTING_PATH="publish/vayyari"
        COMPOSE_SERVICE="store-apk-debug"
        COMPOSE_DIR=""
        ;;
    "store-apk-both"|"store-apks")
        PROJECT_PATH="src/store"
        HOSTING_PATH="publish/vayyari"
        COMPOSE_SERVICE="store-apk-both"
        COMPOSE_DIR=""
        ;;
    "vayyari-apk"|"vayyari-admin-apk"|"admin-app-apk"|"admin-apk"|"admin-apk-debug"|"admin-apk-both")
        PROJECT_PATH="src/vayyari"
        HOSTING_PATH="publish/admin-app"
        COMPOSE_SERVICE="vayyari-admin-apk"
        COMPOSE_DIR=""
        ;;
    "vayyari-ota"|"vayyari-admin-ota"|"admin-app-ota"|"admin-ota")
        PROJECT_PATH="src/vayyari"
        HOSTING_PATH="publish/admin-app/ota"
        COMPOSE_SERVICE="vayyari-admin-ota"
        COMPOSE_DIR=""
        ;;
    "store-ota"|"vayyari-store-ota")
        PROJECT_PATH="src/store"
        HOSTING_PATH="publish/vayyari/ota"
        COMPOSE_SERVICE="store-ota"
        COMPOSE_DIR=""
        ;;
    *)
        echo -e "${RED}Error: Unknown service '$SERVICE_NAME'${NC}"
        echo "Usage: ./deploy.sh [search-api | worker-service | store-api | reasoning-api | whatsapp-processor | store-app | store-apk | store-apk-debug | store-apk-both | store-ota | admin-apk | admin-apk-debug | admin-apk-both | admin-ota]"
        exit 1
        ;;
esac

echo -e "${CYAN}🚀 Starting deployment/build for ${YELLOW}$SERVICE_NAME${NC}..."

# 1. Build and Publish
if [ "$SERVICE_NAME" == "store-app" ] || [ "$SERVICE_NAME" == "vayyari-store" ] || [ "$SERVICE_NAME" == "store" ]; then
    echo -e "${CYAN}🛍️  Building & Publishing Vayyari Store Web & PWA App...${NC}"
    "${ROOT_DIR}/scripts/store/publish-store.sh"
    exit 0

elif [ "$SERVICE_NAME" == "store-apk" ] || [ "$SERVICE_NAME" == "store-apk-release" ] || [ "$SERVICE_NAME" == "vayyari-store-apk" ]; then
    echo -e "${CYAN}📦 Building Vayyari Store Android APK (Release)...${NC}"
    "${ROOT_DIR}/scripts/store/build-store-apk.sh" --release
    exit 0

elif [ "$SERVICE_NAME" == "store-apk-debug" ]; then
    echo -e "${CYAN}🛠️ Building Vayyari Store Android APK (Debug)...${NC}"
    "${ROOT_DIR}/scripts/store/build-store-apk.sh" --debug
    exit 0

elif [ "$SERVICE_NAME" == "store-apk-both" ] || [ "$SERVICE_NAME" == "store-apks" ]; then
    echo -e "${CYAN}📦🛠️ Building Vayyari Store Android APKs (Release & Debug)...${NC}"
    "${ROOT_DIR}/scripts/store/build-store-apk.sh" --both
    exit 0

elif [ "$SERVICE_NAME" == "vayyari-apk" ] || [ "$SERVICE_NAME" == "vayyari-admin-apk" ] || [ "$SERVICE_NAME" == "admin-app-apk" ] || [ "$SERVICE_NAME" == "admin-apk" ]; then
    echo -e "${CYAN}📦 Building Vayyari Admin Android APK (Universal Release)...${NC}"
    "${ROOT_DIR}/src/vayyari/build-apk.sh" --release --arch universal
    exit 0

elif [ "$SERVICE_NAME" == "admin-apk-debug" ]; then
    echo -e "${CYAN}🛠️ Building Vayyari Admin Android APK (Universal Debug)...${NC}"
    "${ROOT_DIR}/src/vayyari/build-apk.sh" --debug --arch universal
    exit 0

elif [ "$SERVICE_NAME" == "admin-apk-both" ]; then
    echo -e "${CYAN}📦🛠️ Building Vayyari Admin Android APKs (Universal Release & Debug)...${NC}"
    "${ROOT_DIR}/src/vayyari/build-apk.sh" --both --arch universal
    exit 0

elif [ "$SERVICE_NAME" == "vayyari-ota" ] || [ "$SERVICE_NAME" == "vayyari-admin-ota" ] || [ "$SERVICE_NAME" == "admin-app-ota" ] || [ "$SERVICE_NAME" == "admin-ota" ]; then
    echo -e "${CYAN}📦 Pushing Vayyari Admin OTA bundle to MinIO local/admin-updates...${NC}"
    cd "$PROJECT_PATH" || exit 1
    shift || true
    ./push-update.sh "$@"
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ OTA bundle push failed.${NC}"
        exit 1
    fi
    cd - > /dev/null

elif [ "$SERVICE_NAME" == "store-ota" ] || [ "$SERVICE_NAME" == "vayyari-store-ota" ]; then
    echo -e "${CYAN}📦 Pushing Vayyari Store OTA bundle to MinIO local/store-updates...${NC}"
    shift || true
    "${ROOT_DIR}/scripts/store/push-store-update.sh" "$@"
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Store OTA bundle push failed.${NC}"
        exit 1
    fi

elif [ "$SERVICE_NAME" == "whatsapp-processor" ]; then
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
    rsync -av --exclude '__pycache__' "$PROJECT_PATH/" "$HOSTING_PATH/"
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ File copy failed. Check permissions.${NC}"
        exit 1
    fi
else
    echo -e "${CYAN}📦 Building and publishing project...${NC}"
    dotnet publish "$PROJECT_PATH" -c Release --no-restore -o "./publish/$SERVICE_NAME"

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
if [ -n "$COMPOSE_DIR" ] && [ -n "$COMPOSE_SERVICE" ]; then
    echo -e "${CYAN}🔄 Restarting / starting container ${YELLOW}$COMPOSE_SERVICE${NC}..."
    cd "$COMPOSE_DIR" && docker compose up -d "$COMPOSE_SERVICE" && docker compose restart "$COMPOSE_SERVICE"

    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Container restart failed.${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Deployment successful for $SERVICE_NAME!${NC}"
