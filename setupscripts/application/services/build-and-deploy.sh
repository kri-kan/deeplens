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
