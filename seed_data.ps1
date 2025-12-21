$ErrorActionPreference = "Stop"

Write-Host "Logging in as Tenant Admin..."
$tokenRes = Invoke-RestMethod "http://localhost:5198/connect/token" -Method Post -Body @{
    grant_type = "password"
    client_id  = "deeplens-webui-dev"
    username   = "admin@vayyari.local"
    password   = "DeepLens@Vayyari123!"
    scope      = "openid profile roles"
}
$token = $tokenRes.access_token
Write-Host "Login Successful!"

$files = Get-ChildItem "data\testData"
if ($files.Count -eq 0) {
    Write-Host "No files found."
    exit
}

Write-Host "Uploading $($files.Count) files..."

# Construct curl command for bulk upload
# The original script used a single bulk upload. The new instruction changes this to individual uploads.
# The $curlArgs array is no longer used for a single bulk command, but the loop now executes curl for each file.
foreach ($f in $files) {
    if ($f.Extension -match "\.(jpg|jpeg|png|mp4|mov|avi|webm)$") {
        Write-Host "Uploading $($f.Name)..."
        $mimeType = "application/octet-stream"
        if ($f.Extension -eq ".jpg" -or $f.Extension -eq ".jpeg") { $mimeType = "image/jpeg" }
        elseif ($f.Extension -eq ".png") { $mimeType = "image/png" }
        elseif ($f.Extension -eq ".mp4") { $mimeType = "video/mp4" }
        elseif ($f.Extension -eq ".mov") { $mimeType = "video/quicktime" }
        
        # Upload file
        # Using /bulk endpoint even for single files as it accepts 'files' parameter and we have metadata logic aligned
        curl.exe -X POST "http://localhost:5000/api/v1/ingest/bulk" `
            -H "Authorization: Bearer $token" `
            -H "accept: */*" `
            -H "Content-Type: multipart/form-data" `
            -F "files=@$($f.FullName);type=$mimeType" `
            -F "metadata={}" `
            -v
    }
}

Write-Host "Seeding Complete!"
