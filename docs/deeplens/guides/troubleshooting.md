# 🛠️ DeepLens Infrastructure Troubleshooting
 
This guide documents common issues and fixes encountered during the setup and deployment of the DeepLens ecosystem on Linux servers.
 
---
 
## 1. Port 80 Conflict (Apache Default Page)
 
**Issue**: When visiting your server IP, you see the "Apache2 Ubuntu Default Page" instead of the DeepLens Service Console.
 
**Cause**: Ubuntu servers often come with a native Apache web server pre-installed and running. It binds to Port 80 before Docker can start the Gateway.
 
**Fix**:
```bash
# Stop and disable the native Apache service
sudo systemctl stop apache2
sudo systemctl disable apache2
 
# Restart the Docker Gateway
./orchestrate-linux.sh start gateway
```
 
---
 
## 2. Docker Permission Denied
 
**Issue**: Running Docker commands or the orchestrator script results in a `permission denied while trying to connect to the docker API` error.
 
**Cause**: Your Linux user does not have permission to access the Docker Unix socket.
 
**Fix**:
```bash
# Add your user to the docker group
sudo usermod -aG docker $USER
 
# Apply the group changes immediately
newgrp docker
```
 
---
 
## 3. SSH Connection / Permission Denied
 
**Issue**: The `deploy-to-server.ps1` script fails with `Permission denied (publickey,password)`.
 
**Cause**: The remote server is not authorized to accept your local machine's SSH keys, or keys haven't been generated yet.
 
**Fix**:
1.  Generate a key locally (if you haven't): `ssh-keygen`
2.  Authorize the key on the server:
    ```powershell
    type $env:USERPROFILE\.ssh\id_rsa.pub | ssh [user]@[ip] "umask 077; test -d .ssh || mkdir .ssh; cat >> .ssh/authorized_keys"
    ```
 
---
 
## 4. Containers Exited / Healthy but Unreachable
 
**Issue**: `docker ps` shows the container as `Up`, but you cannot reach the UI.
 
**Fix**:
Use the built-in validation script to pinpoint if it's a network, routing, or service-level failure:
```bash
./orchestrate-linux.sh validate
```
 
---
 
## 5. Sudo Password Requests in Scripts
 
**Issue**: Scripts pause or fail because they are waiting for a `sudo` password.
 
**Cause**: Automating Docker commands requires your user to be in the `docker` group (see #2) to avoid needing `sudo` for every operation.
 
**Fix**: Ensure your user is in the `docker` group. If you MUST use sudo, ensure your user has `NOPASSWD` configured in `/etc/sudoers` (not recommended for basic setups).
