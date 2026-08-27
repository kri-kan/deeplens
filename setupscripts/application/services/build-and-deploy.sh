#!/bin/bash

# DeepLens Service Build & Deploy Script (Linux)
# Performs builds and moves binaries to /data/hosting

HOSTING_ROOT="/data/hosting"
ROOT_DIR="$(pwd)"

SERVICES_TO_BUILD=("$@")

# --- Source Environment Variables ---
ENV_FILE="$ROOT_DIR/setupscripts/application/services/.env"
if [ -f "$ENV_FILE" ]; then
    echo -e "\e[34m--- Sourcing environment from $ENV_FILE ---\e[0m"
    set -a
    source "$ENV_FILE"
    set +a
else
    echo -e "\e[31mWarning: $ENV_FILE not found. Build may fail.\e[0m"
fi

should_build() {
    local target=$1
    if [ ${#SERVICES_TO_BUILD[@]} -eq 0 ]; then
        return 0
    fi
    for svc in "${SERVICES_TO_BUILD[@]}"; do
        if [ "$svc" == "$target" ]; then
            return 0
        fi
    done
    return 1
}

# Projects array (Dotnet): service_name:project_path:folder_name
projects=(
    "search-api:src/DeepLens.Service/DeepLens.SearchApi/DeepLens.SearchApi.csproj:deeplensapi"
    "worker-service:src/DeepLens.Service/DeepLens.WorkerService/DeepLens.WorkerService.csproj:deeplensworkerservice"
    "identity-api:src/NextGen.Identity/NextGen.Identity.Api/NextGen.Identity.Api.csproj:identity"
)

# --- Build Dotnet Projects ---
for item in "${projects[@]}"; do
    IFS=":" read -r service_name project_path folder_name <<< "$item"
    if should_build "$service_name"; then
    dest_path="$HOSTING_ROOT/$folder_name"
    
    echo -e "\e[36m--- Building $project_path ---\e[0m"
    mkdir -p "$dest_path"
    chown -R $USER:$USER "$dest_path"
    
    dotnet publish "$project_path" -c Release -o "$dest_path" --no-self-contained
    
    if [ $? -eq 0 ]; then
        echo -e "\e[32mSuccessfully published to $dest_path\e[0m"
    else
        echo -e "\e[31mBuild failed for $project_path\e[0m"
    fi
    fi
done

# --- Build WhatsApp Processor (Headless Backend) ---
if should_build "whatsapp-processor"; then
wa_path="src/whatsapp-processor"
wa_dest="$HOSTING_ROOT/whatsapp"

echo -e "\e[36m--- Building WhatsApp Processor ($wa_path) ---\e[0m"
mkdir -p "$wa_dest"
chown -R $USER:$USER "$wa_dest"

cd "$ROOT_DIR/$wa_path" || exit 1
npm install
npm run build

if [ $? -eq 0 ]; then
    rm -rf "$wa_dest/dist"
    cp -r dist "$wa_dest/"
    cp package.json "$wa_dest/"
    cp package-lock.json "$wa_dest/"
    
    cd "$wa_dest" || exit 1
    npm install --omit=dev
    cd "$ROOT_DIR" || exit 1
    echo -e "\e[32mSuccessfully built WhatsApp Processor (Backend) and deployed to $wa_dest\e[0m"
else
    echo -e "\e[31mWhatsApp Processor build failed!\e[0m"
    cd "$ROOT_DIR" || exit 1
fi
fi

# --- Copy Reasoning API source files ---
if should_build "reasoning-api"; then
reasoning_path="src/DeepLens.ReasoningService"
reasoning_dest="$HOSTING_ROOT/reasoning-api"

echo -e "\e[36m--- Copying Reasoning Service ($reasoning_path) ---\e[0m"
mkdir -p "$reasoning_dest"
chown -R $USER:$USER "$reasoning_dest"

cp -r "$ROOT_DIR/$reasoning_path"/* "$reasoning_dest/"
if [ $? -eq 0 ]; then
    echo -e "\e[32mSuccessfully deployed Reasoning Service to $reasoning_dest\e[0m"
else
    echo -e "\e[31mReasoning Service copy failed!\e[0m"
fi
fi


# --- Build Web UI (using Docker to avoid host dependencies) ---
if should_build "web-ui"; then
web_ui_path="src/DeepLens.WebUI"
web_ui_dest="$HOSTING_ROOT/deeplenswebui"

echo -e "\e[36m--- Building Web UI ($web_ui_path) via Docker ---\e[0m"
mkdir -p "$web_ui_dest"
chown -R $USER:$USER "$web_ui_dest"

docker run --rm \
  --network host \
  -v "$ROOT_DIR/$web_ui_path":/src \
  -v "$web_ui_dest":/dest \
  -w /src \
  node:22-alpine \
  sh -c "npm install && npx vite build && cp -rv dist/* /dest/"

if [ $? -eq 0 ]; then
    echo -e "\e[32mSuccessfully built Web UI and deployed to $web_ui_dest\e[0m"
else
    echo -e "\e[31mWeb UI build failed!\e[0m"
fi
fi

# --- Build Vayyari Mobile APK (Release) ---
if should_build "vayyari-apk"; then
vayyari_path="src/vayyari"
vayyari_dest="$ROOT_DIR/publish/vayyari"

echo -e "\e[36m--- Building Vayyari APK ($vayyari_path) ---\e[0m"
mkdir -p "$vayyari_dest"

cd "$ROOT_DIR/$vayyari_path/android" || exit 1
./gradlew assembleRelease -x lint -x lintVitalAnalyzeRelease -Pandroid.enablePngCrunchInReleaseBuilds=false

if [ $? -eq 0 ]; then
    built_apk="$ROOT_DIR/$vayyari_path/android/app/build/outputs/apk/release/app-release.apk"
    if [ -f "$built_apk" ]; then
        timestamp=$(date +%Y%m%d)
        version="v1.0.0"
        versioned_apk="vayyari-${version}-${timestamp}.apk"
        cp "$built_apk" "$vayyari_dest/$versioned_apk"
        cp "$built_apk" "$vayyari_dest/vayyari-latest.apk"
        echo -e "\e[32mSuccessfully built and published $versioned_apk and vayyari-latest.apk to $vayyari_dest\e[0m"

        # Prune old historical APKs (keep 3 latest)
        apk_files=($(ls -1t "$vayyari_dest"/vayyari-v*.apk 2>/dev/null || true))
        total_apks=${#apk_files[@]}
        keep_apks=3
        if [ "$total_apks" -gt "$keep_apks" ]; then
            for ((i=keep_apks; i<total_apks; i++)); do
                echo -e "\e[33m   Removing old APK: ${apk_files[$i]}\e[0m"
                rm -f "${apk_files[$i]}"
            done
        fi
    else
        echo -e "\e[31mVayyari APK not found at $built_apk!\e[0m"
    fi
else
    echo -e "\e[31mVayyari APK build failed!\e[0m"
fi
cd "$ROOT_DIR" || exit 1
fi

# --- Push Vayyari OTA Updates ---
if should_build "vayyari-ota"; then
vayyari_path="src/vayyari"
echo -e "\e[36m--- Pushing Vayyari OTA Updates to MinIO ($vayyari_path) ---\e[0m"
cd "$ROOT_DIR/$vayyari_path" || exit 1
./push-update.sh
if [ $? -eq 0 ]; then
    echo -e "\e[32mSuccessfully pushed Vayyari OTA bundle to MinIO local/vayyari-updates\e[0m"
else
    echo -e "\e[31mVayyari OTA bundle push failed!\e[0m"
fi
cd "$ROOT_DIR" || exit 1
fi

echo -e "\e[33m--- Restarting Containers ---\e[0m"
cd "$ROOT_DIR/setupscripts/application/services"

for item in "${projects[@]}"; do
    IFS=":" read -r service_name project_path folder_name <<< "$item"
    if should_build "$service_name"; then
        docker compose restart "$service_name"
    fi
done

if should_build "web-ui"; then
    docker compose restart "web-ui"
fi

if should_build "whatsapp-processor"; then
    echo -e "\e[33m--- Restarting WhatsApp Container ---\e[0m"
    cd "$ROOT_DIR/setupscripts/application/whatsapp"
    docker compose restart "whatsapp-processor"
fi

if should_build "reasoning-api"; then
    echo -e "\e[33m--- Restarting Reasoning Container ---\e[0m"
    cd "$ROOT_DIR/setupscripts/application"
    docker compose restart "reasoning-api"
fi
