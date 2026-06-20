param(
    [string[]]$ServicesToBuild = @()
)

function Should-Build {
    param([string]$Target)
    if ($ServicesToBuild.Count -eq 0) { return $true }
    return $ServicesToBuild -contains $Target
}

$hostingRoot = "/data/hosting"
$projects = @(
    @{
        Name = "search-api"
        Path = "src/DeepLens.Service/DeepLens.SearchApi/DeepLens.SearchApi.csproj"
        Dest = "$hostingRoot/deeplensapi"
    },
    @{
        Name = "worker-service"
        Path = "src/DeepLens.Service/DeepLens.WorkerService/DeepLens.WorkerService.csproj"
        Dest = "$hostingRoot/deeplensworkerservice"
    },
    @{
        Name = "identity-api"
        Path = "src/NextGen.Identity/NextGen.Identity.Api/NextGen.Identity.Api.csproj"
        Dest = "$hostingRoot/identity"
    }
)

foreach ($project in $projects) {
    if (Should-Build $project.Name) {
        Write-Host "--- Building $($project.Path) ---" -ForegroundColor Cyan
        
        if (-not (Test-Path $project.Dest)) {
            New-Item -ItemType Directory -Force -Path $project.Dest
        }

        dotnet publish $project.Path -c Release -o $project.Dest --no-self-contained

        if ($LASTEXITCODE -eq 0) {
            Write-Host "Successfully published to $($project.Dest)" -ForegroundColor Green
        } else {
            Write-Host "Build failed for $($project.Path)" -ForegroundColor Red
        }
    }
}

if (Should-Build "whatsapp-processor") {
    Write-Host "--- Building src/whatsapp-processor ---" -ForegroundColor Cyan
    $waDest = "$hostingRoot/whatsapp"
    if (-not (Test-Path $waDest)) {
        New-Item -ItemType Directory -Force -Path $waDest
    }

    $waPath = "src/whatsapp-processor"
    Push-Location $waPath
    npm install
    npm run build:all
    if ($LASTEXITCODE -eq 0) {
        if (Test-Path "$waDest/dist") { Remove-Item -Recurse -Force "$waDest/dist" }
        if (Test-Path "$waDest/public") { Remove-Item -Recurse -Force "$waDest/public" }
        if (Test-Path "dist") { Copy-Item -Recurse -Force "dist" "$waDest/" }
        if (Test-Path "public") { Copy-Item -Recurse -Force "public" "$waDest/" }
        if (Test-Path "package.json") { Copy-Item -Force "package.json" "$waDest/" }
        if (Test-Path "package-lock.json") { Copy-Item -Force "package-lock.json" "$waDest/" }
        
        Pop-Location
        Push-Location $waDest
        npm install --omit=dev
        Pop-Location
        Write-Host "Successfully published WhatsApp Processor to $waDest" -ForegroundColor Green
    } else {
        Pop-Location
        Write-Host "Build failed for $waPath" -ForegroundColor Red
    }
}

if (Should-Build "reasoning-api") {
    Write-Host "--- Copying Reasoning Service (src/DeepLens.ReasoningService) ---" -ForegroundColor Cyan
    $reasoningDest = "$hostingRoot/reasoning-api"
    if (-not (Test-Path $reasoningDest)) {
        New-Item -ItemType Directory -Force -Path $reasoningDest
    }
    Copy-Item -Recurse -Force "src/DeepLens.ReasoningService/*" "$reasoningDest/"
    Write-Host "Successfully deployed Reasoning Service to $reasoningDest" -ForegroundColor Green
}

Write-Host "--- Restarting Containers ---" -ForegroundColor Yellow

foreach ($project in $projects) {
    if (Should-Build $project.Name) {
        docker compose -f setupscripts/application/services/docker-compose.yaml restart $project.Name
    }
}

if (Should-Build "whatsapp-processor") {
    Write-Host "--- Restarting WhatsApp Container ---" -ForegroundColor Yellow
    docker compose -f setupscripts/application/whatsapp/docker-compose.yaml restart "whatsapp-processor"
}

if (Should-Build "reasoning-api") {
    Write-Host "--- Restarting Reasoning Container ---" -ForegroundColor Yellow
    docker compose -f setupscripts/application/docker-compose.yaml restart "reasoning-api"
}
