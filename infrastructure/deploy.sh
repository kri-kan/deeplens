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
    echo "Usage: ./deploy.sh [search-api | worker-service | store-api | reasoning-api | whatsapp-processor | vayyari-apk | vayyari-ota]"
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
    "vayyari-apk"|"vayyari-admin-apk"|"admin-app-apk"|"admin-apk")
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
    *)
        echo -e "${RED}Error: Unknown service '$SERVICE_NAME'${NC}"
        echo "Usage: ./deploy.sh [search-api | worker-service | store-api | reasoning-api | whatsapp-processor | store-app | store-apk | store-apk-debug | store-apk-both | vayyari-admin-apk | admin-apk | vayyari-apk | vayyari-ota]"
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
    echo -e "${CYAN}📦 Building Vayyari Admin Android APK (Release)...${NC}"
    cd "$PROJECT_PATH/android" || exit 1
    
    # Execute Gradle release build with required optimization flags
    ./gradlew assembleRelease -x lint -x lintVitalAnalyzeRelease -Pandroid.enablePngCrunchInReleaseBuilds=false
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ APK build failed. Deployment aborted.${NC}"
        exit 1
    fi
    cd - > /dev/null

    BUILT_APK="$PROJECT_PATH/android/app/build/outputs/apk/release/app-release.apk"
    if [ ! -f "$BUILT_APK" ]; then
        echo -e "${RED}❌ Output APK not found at $BUILT_APK${NC}"
        exit 1
    fi

    echo -e "${CYAN}📂 Publishing APK to $HOSTING_PATH...${NC}"
    mkdir -p "$HOSTING_PATH"
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    VERSION="v1.0.0"
    VERSIONED_APK="vayyari-admin-${VERSION}-${TIMESTAMP}.apk"
    LATEST_APK="vayyari-admin-latest.apk"
    
    cp "$BUILT_APK" "$HOSTING_PATH/$VERSIONED_APK"
    cp "$BUILT_APK" "$HOSTING_PATH/$LATEST_APK"
    echo -e "${GREEN}✅ Published $VERSIONED_APK and updated $LATEST_APK${NC}"

    # Pruning historical APKs: keep newest 3 historical APKs
    echo -e "${CYAN}🧹 Pruning old historical APKs in $HOSTING_PATH (keeping newest 3)...${NC}"
    KEEP_HISTORICAL=3
    APK_FILES=($(ls -1t "$HOSTING_PATH"/vayyari-admin-v*.apk 2>/dev/null || true))
    TOTAL_APKS=${#APK_FILES[@]}
    if [ "$TOTAL_APKS" -gt "$KEEP_HISTORICAL" ]; then
        for ((i=KEEP_HISTORICAL; i<TOTAL_APKS; i++)); do
            echo -e "${YELLOW}   Removing old APK: ${APK_FILES[$i]}${NC}"
            rm -f "${APK_FILES[$i]}"
        done
        echo -e "${GREEN}✅ APK pruning complete.${NC}"
    else
        echo -e "${GREEN}✅ APK count ($TOTAL_APKS) within retention limit ($KEEP_HISTORICAL). No pruning needed.${NC}"
    fi

    APK_SIZE=$(du -h "$HOSTING_PATH/$LATEST_APK" | cut -f1)
    APK_SHA=$(sha256sum "$HOSTING_PATH/$LATEST_APK" | cut -d' ' -f1)
    echo -e "${GREEN}✅ Vayyari Admin APK generated successfully: $HOSTING_PATH/$LATEST_APK ($APK_SIZE, SHA256: $APK_SHA)${NC}"
    exit 0

elif [ "$SERVICE_NAME" == "vayyari-ota" ] || [ "$SERVICE_NAME" == "vayyari-admin-ota" ] || [ "$SERVICE_NAME" == "admin-app-ota" ] || [ "$SERVICE_NAME" == "admin-ota" ]; then
    echo -e "${CYAN}📦 Pushing Vayyari Admin OTA bundle to MinIO local/vayyari-updates...${NC}"
    cd "$PROJECT_PATH" || exit 1
    shift || true
    ./push-update.sh "$@"
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ OTA bundle push failed.${NC}"
        exit 1
    fi
    cd - > /dev/null

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
