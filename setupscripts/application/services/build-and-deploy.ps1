# DeepLens Service Build & Deploy Script
# Performs dotnet publish to the hosting directories used by Docker

$hostingRoot = "/data/hosting"
$projects = @(
    @{
        Path = "src/DeepLens.Service/DeepLens.SearchApi/DeepLens.SearchApi.csproj"
        Dest = "$hostingRoot/deeplensapi"
    },
    @{
        Path = "src/DeepLens.Service/DeepLens.WorkerService/DeepLens.WorkerService.csproj"
        Dest = "$hostingRoot/deeplensworkerservice"
    },
    @{
        Path = "src/NextGen.Identity/NextGen.Identity.Api/NextGen.Identity.Api.csproj"
        Dest = "$hostingRoot/identity"
    }
)

foreach ($project in $projects) {
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

Write-Host "--- Restarting Containers ---" -ForegroundColor Yellow
docker compose -p deeplens-apps restart
