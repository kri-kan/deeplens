param (
    [Parameter(Mandatory=$false)]
    [ValidateSet("Clean", "List")]
    [string]$Action = "List",

    [Parameter(Mandatory=$false)]
    [string]$BucketName = "whatsapp-data",

    [Parameter(Mandatory=$false)]
    [string]$ContainerName = "deeplens-minio"
)

$ErrorActionPreference = "Continue"

function Run-Mc-Cmd {
    param($Cmd)
    # Write-Host "DEBUG: Running mc $Cmd" -ForegroundColor DarkGray
    # Configure alias first, then run command
    $setupAlias = "mc alias set local http://localhost:9000 deeplens DeepLens123! >/dev/null 2>&1"
    podman exec $ContainerName sh -c "$setupAlias && mc $Cmd" 2>&1
}

Write-Host "MinIO Manager: Performing $Action on bucket '$BucketName'..." -ForegroundColor Cyan

try {
    switch ($Action) {
        "List" {
            Write-Host "  Listing objects..." -ForegroundColor Gray
            $res = Run-Mc-Cmd "ls --recursive local/$BucketName"
            Write-Host $res -ForegroundColor White
        }

        "Clean" {
            # "Nuke and Pave" strategy: Remove bucket completely and recreate it.
            # This is O(1) for the client and handles huge datasets much better than recursive rm.
            
            Write-Host "  Recreating bucket (Nuke & Pave)..." -ForegroundColor Yellow
            
            # rb --force deletes bucket and all contents
            $res = Run-Mc-Cmd "rb --force local/$BucketName" 2>&1
            
            # Ignore "Bucket does not exist" error on rb
            if ($LASTEXITCODE -ne 0 -and $res -notmatch "does not exist") {
                 throw "Failed to remove bucket: $res" 
            }

            # Recreate bucket
            $resMb = Run-Mc-Cmd "mb local/$BucketName" 2>&1
            if ($LASTEXITCODE -ne 0) { throw "Failed to recreate bucket: $resMb" }
            
            Write-Host "  [OK] Bucket cleaned." -ForegroundColor Green
        }
    }
} catch {
    Write-Host "  [ERROR] $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
