# DeepLens Troubleshooting Guide

**Solutions for common issues found during development and deployment.**

Last Updated: December 20, 2025

---

## 📋 Table of Contents
- [.NET & PowerShell Issues](#-net--powershell-issues)
- [Podman & Container Issues](#-podman--container-issues)
- [Service-Specific Issues](#-service-specific-issues)
- [Tenant & Multi-Tenant Issues](#-tenant--multi-tenant-issues)

---

## 🛠️ .NET & PowerShell Issues

### .NET SDK Not Found
**Symptoms:** `dotnet : The term 'dotnet' is not recognized...`

**Solution:**
```powershell
# Option 1: Use full path
& "C:\Program Files\dotnet\dotnet.exe" run --urls=http://localhost:5198

# Option 2: Add to PATH (permanent)
$env:Path += ";C:\Program Files\dotnet"
[Environment]::SetEnvironmentVariable("Path", $env:Path, [System.EnvironmentVariableTarget]::User)
```

### PowerShell Script Execution Blocked
**Symptoms:** `File cannot be loaded because running scripts is disabled on this system`

**Solution:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Identity API - "Production signing credential not configured"
**Solution:** Ensure `ASPNETCORE_ENVIRONMENT` is set to `Development`.
```powershell
$env:ASPNETCORE_ENVIRONMENT='Development'
dotnet run --urls=http://localhost:5198
```

---

## 🐳 Podman & Container Issues

### Podman Machine Won't Start
**Solution:** Reset the machine:
```powershell
podman machine stop podman-machine-default
podman machine rm podman-machine-default
podman machine init
podman machine start
```

### Port Already in Use
**Symptoms:** Container fails to start with "port in use" error.

**Solution:** Find and kill the process:
```powershell
# Example: Check port 5433
netstat -ano | findstr :5433
taskkill /PID <PID> /F
```

### Container Stuck in "Created" State
**Solution:** This usually indicates a config file mount error or port conflict on Windows. Check logs:
```powershell
podman logs <container-name>
```
**Pro Tip:** Use **Named Volumes** instead of bind mounts for persistence on Windows.

---

## 🐘 Service-Specific Issues

### PostgreSQL Authentication Failure
**Symptoms:** "password authentication failed for user postgres"

**Solution:** If you changed passwords, the old volume might still have the old data.
```powershell
podman stop deeplens-postgres && podman rm deeplens-postgres
podman volume rm deeplens-postgres-data
# Then start the container again
```

### Identity API Can't Connect to Database
**Check connection status:**
```powershell
podman exec deeplens-postgres psql -U postgres -d nextgen_identity -c "SELECT 1;"
```
**Common Checks:**
- Port: Ensure it's **5433** (not 5432).
- Password: **DeepLens123!**
- Network: Ensure API and DB are reachable.

---

## 🏢 Tenant & Multi-Tenant Issues

### Missing `deeplens-network`
**Symptoms:** `provision-tenant.ps1` fails during container creation.

**Solution:**
```powershell
podman network create deeplens-network
```

### Tenant Port Conflicts
**Symptoms:** Tenant Qdrant/MinIO containers won't start.

**Solution:** The script handles auto-assignment, but if you have core services running on the same ports, they must be stopped:
```powershell
podman stop deeplens-qdrant deeplens-minio
```

### Accessing Tenant Logs
```powershell
podman logs deeplens-qdrant-<tenant_name>
podman logs deeplens-minio-<tenant_name>
```

---

## 💡 Best Practices for Troubleshooting
1. **Always check logs first:** `podman logs <container-name>`
2. **Clean starts:** Use `podman rm -f <name>` and repeat provisioning.
3. **Wait for Health:** Wait 5-10 seconds after starting containers for services to fully initialize.
4. **Environment Check:** Ensure your environment variables are set correctly (`$env:ASPNETCORE_ENVIRONMENT`).
