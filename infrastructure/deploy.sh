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
    echo "Usage: ./deploy.sh [search-api | worker-service | reasoning-api | whatsapp-processor]"
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
    "vayyari-apk")
        PROJECT_PATH="src/vayyari"
        HOSTING_PATH="publish/vayyari"
        COMPOSE_SERVICE="vayyari-apk"
        COMPOSE_DIR=""
        ;;
    "vayyari-ota")
        PROJECT_PATH="src/vayyari"
        HOSTING_PATH="publish/vayyari/ota"
        COMPOSE_SERVICE="vayyari-ota"
        COMPOSE_DIR=""
        ;;
    *)
        echo -e "${RED}Error: Unknown service '$SERVICE_NAME'${NC}"
        echo "Usage: ./deploy.sh [search-api | worker-service | reasoning-api | whatsapp-processor | vayyari-apk | vayyari-ota]"
        exit 1
        ;;
esac

echo -e "${CYAN}🚀 Starting deployment/build for ${YELLOW}$SERVICE_NAME${NC}..."

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
    rsync -av --exclude '__pycache__' "$PROJECT_PATH/" "$HOSTING_PATH/"
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ File copy failed. Check permissions.${NC}"
        exit 1
    fi
elif [ "$SERVICE_NAME" == "vayyari-apk" ]; then
    echo -e "${CYAN}📱 Building Standalone Vayyari Release APK...${NC}"
    cd "$PROJECT_PATH/android" || exit 1
    ./gradlew assembleRelease
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Gradle assembleRelease failed.${NC}"
        exit 1
    fi
    cd - > /dev/null

    APK_SOURCE="$PROJECT_PATH/android/app/build/outputs/apk/release/app-release.apk"
    if [ ! -f "$APK_SOURCE" ]; then
        echo -e "${RED}❌ APK build output not found at $APK_SOURCE${NC}"
        exit 1
    fi

    mkdir -p "$HOSTING_PATH"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    VERSIONED_APK="$HOSTING_PATH/vayyari-$TIMESTAMP.apk"
    LATEST_APK="$HOSTING_PATH/vayyari-latest.apk"

    echo -e "${CYAN}📂 Copying APK to $VERSIONED_APK and linking $LATEST_APK...${NC}"
    cp "$APK_SOURCE" "$VERSIONED_APK"
    cp "$APK_SOURCE" "$LATEST_APK"

    # Prune older APKs, retaining the 3 newest versions
    echo -e "${CYAN}🧹 Retaining 3 newest versioned APKs in $HOSTING_PATH...${NC}"
    ls -1t "$HOSTING_PATH"/vayyari-[0-9]*_[0-9]*.apk 2>/dev/null | tail -n +4 | xargs -r rm -f

    APK_SIZE=$(du -h "$LATEST_APK" | cut -f1)
    APK_SHA=$(sha256sum "$LATEST_APK" | cut -d' ' -f1)
    echo -e "${GREEN}✅ APK generated successfully: $LATEST_APK ($APK_SIZE, SHA256: $APK_SHA)${NC}"
    exit 0
elif [ "$SERVICE_NAME" == "vayyari-ota" ]; then
    echo -e "${CYAN}📱 Exporting Vayyari OTA Bundle...${NC}"
    cd "$PROJECT_PATH" || exit 1
    mkdir -p "../../$HOSTING_PATH"
    npx expo export --output-dir "../../$HOSTING_PATH"
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Expo export failed.${NC}"
        exit 1
    fi
    cd - > /dev/null
    echo -e "${GREEN}✅ OTA bundle exported to $HOSTING_PATH!${NC}"
    exit 0
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
    echo -e "${CYAN}🔄 Restarting container ${YELLOW}$COMPOSE_SERVICE${NC}..."
    cd "$COMPOSE_DIR" && docker compose restart "$COMPOSE_SERVICE"

    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Container restart failed.${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Deployment successful for $SERVICE_NAME!${NC}"
