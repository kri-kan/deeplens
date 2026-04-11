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

$MINIO_HOST = "192.168.0.170"
$MINIO_USER = "krikan"
$MINIO_PASS = "Krikank1$"

function Run-Mc-Cmd {
    param($Cmd)
    # Configure alias first, then run command using a temporary mc container
    $setupAlias = "mc alias set remote http://$MINIO_HOST:9000 $MINIO_USER $MINIO_PASS >/dev/null 2>&1"
    podman run --rm --network host minio/mc sh -c "$setupAlias && mc $Cmd" 2>&1
}

Write-Host "MinIO Manager: Performing $Action on bucket '$BucketName'..." -ForegroundColor Cyan

try {
    switch ($Action) {
        "List" {
            Write-Host "  Listing objects..." -ForegroundColor Gray
            $res = Run-Mc-Cmd "ls --recursive remote/$BucketName"
            Write-Host $res -ForegroundColor White
        }

        "Clean" {
            # "Nuke and Pave" strategy: Remove bucket completely and recreate it.
            # This is O(1) for the client and handles huge datasets much better than recursive rm.
            
            Write-Host "  Recreating bucket (Nuke & Pave)..." -ForegroundColor Yellow
            
            # rb --force deletes bucket and all contents
            $res = Run-Mc-Cmd "rb --force remote/$BucketName" 2>&1
            
            # Ignore "Bucket does not exist" error on rb
            if ($LASTEXITCODE -ne 0 -and $res -notmatch "does not exist") {
                 throw "Failed to remove bucket: $res" 
            }

            # Recreate bucket
            $resMb = Run-Mc-Cmd "mb remote/$BucketName" 2>&1
            if ($LASTEXITCODE -ne 0) { throw "Failed to recreate bucket: $resMb" }
            
            Write-Host "  [OK] Bucket cleaned." -ForegroundColor Green
        }
    }
} catch {
    Write-Host "  [ERROR] $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
