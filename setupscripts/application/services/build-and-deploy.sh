#!/bin/bash

# DeepLens Service Build & Deploy Script (Linux)
# Performs builds and moves binaries to /data/hosting

HOSTING_ROOT="/data/hosting"
ROOT_DIR="$(pwd)"

# Projects array (Dotnet)
projects=(
    "src/DeepLens.Service/DeepLens.SearchApi/DeepLens.SearchApi.csproj:deeplensapi"
    "src/DeepLens.Service/DeepLens.WorkerService/DeepLens.WorkerService.csproj:deeplensworkerservice"
    "src/NextGen.Identity/NextGen.Identity.Api/NextGen.Identity.Api.csproj:identity"
)

# --- Build Dotnet Projects ---
for item in "${projects[@]}"; do
    IFS=":" read -r project_path folder_name <<< "$item"
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
done

# --- Build Web UI (using Docker to avoid host dependencies) ---
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

echo -e "\e[33m--- Restarting Containers ---\e[0m"
cd "$ROOT_DIR/setupscripts/application/services"
docker compose up -d --force-recreate
