# Table of Contents

- [Docker Setup Instructions (Ubuntu)](#docker-setup-instructions-ubuntu)
  - [1. Set Up Docker's apt Repository](#1-set-up-dockers-apt-repository)
  - [2. Install Docker Packages](#2-install-docker-packages)
  - [3. Verify Docker Installation](#3-verify-docker-installation)

- [Enabling Remote Desktop Access on Ubuntu Server with XRDP](#enabling-remote-desktop-access-on-ubuntu-server-with-xrdp)
  - [Prerequisites](#prerequisites)
  - [1. Update the System](#1-update-the-system)
  - [2. Install XRDP](#2-install-xrdp)
  - [3. Verify and Start XRDP Service](#3-verify-and-start-xrdp-service)
  - [4. Configure the Firewall](#4-configure-the-firewall)
    - [Allow RDP from Intranet Only](#41-if-you-want-to-allow-rdp-connections-only-from-your-intranet-for-example-only-from-the-19216810-24-subnet-you-should-specify-the-source-ip-range-like-this)
  - [5. Configure User Permissions (Optional)](#5-configure-user-permissions-optional)
  - [6. Restart XRDP](#6-restart-xrdp)
  - [7. Get the Standard Ubuntu Desktop UI in XRDP](#7-get-the-standard-ubuntu-desktop-ui-in-xrdp)
  - [8. Revert to the Regular GNOME UI in XRDP](#8-revert-to-the-regular-gnome-ui-in-xrdp)

- [Setting Up Ollama on Docker with RX 580 GPU](#setting-up-ollama-on-docker-with-rx-580-gpu)
  - [1. Hardware Permissions (Host Side)](#1-hardware-permissions-host-side)
  - [2. The "Golden" Docker Launch Command](#2-the-golden-docker-launch-command)
  - [3. Model Initialization](#3-model-initialization)
  - [4. Verification (The "Green Light" Check)](#4-verification-the-green-light-check)
  - [5. API Consumption](#5-api-consumption)

- [Installing PowerShell 7 (Ubuntu)](#installing-powershell-7-ubuntu)
  - [Installation via Microsoft Repository](#installation-via-microsoft-repository-recommended)

- [Installing .NET 9 SDK (Ubuntu)](#installing-net-9-sdk-ubuntu)
  - [1. Add the .NET Backports Repository](#1-add-the-net-backports-repository)
  - [2. Install the .NET SDK](#2-install-the-net-sdk)
  - [3. Verify Installation](#3-verify-installation)

- [Setting Up CopyQ (Clipboard Manager)](#setting-up-copyq-clipboard-manager)
  - [1. Install via Terminal](#1-install-via-terminal)
  - [2. Initial Setup](#2-initial-setup)
  - [3. Set a Global Shortcut (Super + V)](#3-set-a-global-shortcut-super--v)

- [Installing Antigravity (IDE & Agent Manager)](#installing-antigravity-ide--agent-manager)
  - [1. Directory Structure and Execution Layout](#1-directory-structure-and-execution-layout)
  - [2. Setting Up Sandbox Permissions](#2-setting-up-sandbox-permissions)
  - [3. Desktop and Menu Shortcuts](#3-desktop-and-menu-shortcuts)
  - [4. Automating with the Install/Update Script](#4-automating-with-the-installupdate-script)

- [Summary Checklist for New Machines](#summary-checklist-for-new-machines)




# Docker Setup Instructions (Ubuntu)

This section provides step-by-step instructions to install Docker Engine on Ubuntu using the official apt repository.

## 1. Set Up Docker's apt Repository
Before installing Docker Engine, set up the Docker apt repository.

### Add Docker's Official GPG Key

```bash
sudo apt update
sudo apt install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

### Add the Repository to Apt Sources

```bash
sudo tee /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
sudo apt update
```

## 2. Install Docker Packages

To install the latest version of Docker Engine and related components, run:

```bash
sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

> **Note:** The Docker service starts automatically after installation.

## 3. Verify Docker Installation

Check that Docker is running:

```bash
sudo systemctl status docker
```

If Docker is not running, start it manually:

```bash
sudo systemctl start docker
```

Run the hello-world image to verify the installation:

```bash
sudo docker run hello-world
```

This command downloads a test image and runs it in a container. When the container runs, it prints a confirmation message and exits.

# Enabling Remote Desktop Access on Ubuntu Server with XRDP

This guide provides step-by-step instructions to enable remote desktop access on an Ubuntu server using **XRDP**.

## Prerequisites
- Ubuntu server with sudo privileges
- Internet connection

## 1. Update the System
Ensure your package list is current:

```bash
sudo apt update
```

## 2. Install XRDP
Install the XRDP server:

```bash
sudo apt install xrdp -y
```

## 3. Verify and Start XRDP Service
Check that XRDP is running and set to start on boot:

```bash
sudo systemctl status xrdp
sudo systemctl enable xrdp
```

## 4. Configure the Firewall
Allow RDP traffic (port 3389) through the firewall:

```bash
sudo ufw allow 3389/tcp
sudo ufw reload
```
## 4.1 If you want to allow RDP connections only from your intranet (for example, only from the 192.168.1.0/24 subnet), you should specify the source IP range like this:

```bash
sudo ufw allow from 192.168.1.0/24 to any port 3389 proto tcp
```


## 5. Configure User Permissions (Optional)
If the connection fails, you may need to add the XRDP user to the `ssl-cert` group:

```bash
sudo adduser xrdp ssl-cert
```

## 6. Restart XRDP
Restart the XRDP service to apply all changes:

```bash
sudo systemctl restart xrdp
```

## 7. Get the Standard Ubuntu Desktop UI in XRDP

By default, XRDP launches a generic GNOME session, which looks different from the standard Ubuntu desktop (with the left-side dock and Yaru theme). This is because Ubuntu-specific customizations are not loaded in a standard remote session.

To get the standard Ubuntu UI in your XRDP session:

### 1. Configure the Ubuntu Session Mode
Create a `.xsessionrc` file in your home directory to force XRDP to load Ubuntu customizations. Run these commands on your Ubuntu server:

```bash
cat <<EOF > ~/.xsessionrc
export GNOME_SHELL_SESSION_MODE=ubuntu
export XDG_CURRENT_DESKTOP=ubuntu:GNOME
export XDG_CONFIG_DIRS=/etc/xdg/xdg-ubuntu:/etc/xdg
EOF
```

### 2. Restart XRDP
After creating the file, restart the XRDP service:

```bash
sudo systemctl restart xrdp
```

Now, when you connect via RDP, you should see the standard Ubuntu desktop environment.
## 8. Revert to the Regular GNOME UI in XRDP

If you want to switch back to the default (bare) GNOME interface after customizing your XRDP session for the Ubuntu UI, simply remove or rename the `.xsessionrc` file you created earlier.

### 1. The Quickest Way (Delete the file)
Delete the configuration file:

```bash
rm ~/.xsessionrc
```

### 2. The Safer Way (Rename/Disable the file)
If you may want to restore the Ubuntu UI later, rename the file instead:

```bash
mv ~/.xsessionrc ~/.xsessionrc.bak
```

### 3. Restart the Session
After deleting or renaming the file:
- Log out of your current RDP session.
- (Optional, but recommended) Restart the XRDP service:

```bash
sudo systemctl restart xrdp
```

Log back in. You will now see the generic GNOME interface.

## Setting Up Ollama on Docker with RX 580 GPU

To set up your RX 580 (Polaris 2048SP) on a fresh Ubuntu server with Docker, follow these streamlined steps. This bypasses all the "trial and error" and goes straight to the Vulkan-accelerated container setup that works for your hardware.

### 1. Hardware Permissions (Host Side)
Docker needs permission to "hand over" the GPU to the container. Run this on your host machine:

```bash
# Add your user and the docker group to video and render groups
sudo usermod -aG video,render $USER
# Restart the Docker daemon to apply group changes
sudo systemctl restart docker
```

### 2. The "Golden" Docker Launch Command
This single command pulls the correct image, maps the hardware "pipes" (kfd for compute, dri for rendering), and injects the Polaris 8.0.3 override.

```bash
docker run -d \
  --name ollama-gpu \
  --restart always \
  --network deeplens-network \
  --device /dev/kfd --device /dev/dri \
  -v ollama_storage:/root/.ollama \
  -p 11434:11434 \
  -e OLLAMA_VULKAN=1 \
  -e HSA_OVERRIDE_GFX_VERSION=8.0.3 \
  -e OLLAMA_INTEL_GPU=0 \
  ollama/ollama
```

**Why this works:** The `OLLAMA_VULKAN=1` flag is the "magic bullet" for the RX 580 in 2026. It is far more stable than the ROCm drivers for this specific card architecture.

### 3. Model Initialization
Since the container starts empty, you must "pull" the model into the persistent volume once:

```bash
docker exec -it ollama-gpu ollama pull llama3
```

### 4. Verification (The "Green Light" Check)
Confirm the GPU is active by checking the logs for the 8.0 GiB VRAM handshake:

```bash
docker logs ollama-gpu | grep -iE "vulkan|vram"
```

Success looks like: `library=Vulkan ... name=Vulkan0 ... total="8.0 GiB"`

### 5. API Consumption
Your server is now ready. You can hit it from your C# DeepLens app or via curl:

**Endpoint:** `http://<server-ip>:11434/api/generate`

**Sample Payload:**

```json
{
  "model": "llama3",
  "prompt": "Analyze these files.",
  "stream": false
}
```

# Installing PowerShell 7 (Ubuntu)

This section provides instructions to install PowerShell 7 on Ubuntu using the official Microsoft package repository.

## Installation via Microsoft Repository (Recommended)

Run the following script to register the Microsoft repository and install PowerShell:

```bash
# Update the list of packages
sudo apt-get update

# Install pre-requisite packages
sudo apt-get install -y wget apt-transport-https software-properties-common

# Get the version of Ubuntu
source /etc/os-release

# Download the Microsoft repository keys
wget -q https://packages.microsoft.com/config/ubuntu/$VERSION_ID/packages-microsoft-prod.deb

# Register the Microsoft repository keys
sudo dpkg -i packages-microsoft-prod.deb

# Delete the Microsoft repository keys file
rm packages-microsoft-prod.deb

# Update the list of packages after adding the Microsoft repo
sudo apt-get update

# Install PowerShell
sudo apt-get install -y powershell
```

## Start PowerShell
After installation, you can start PowerShell by running:

```bash
pwsh
```

# Installing .NET 9 SDK (Ubuntu)

This section provides instructions to install the latest .NET 9 SDK using the official Ubuntu .NET backports repository.

## 1. Add the .NET Backports Repository
The backports repository provides the latest .NET versions for Ubuntu:

```bash
sudo add-apt-repository ppa:dotnet/backports
```

## 2. Install the .NET SDK
The SDK includes the runtime and all development tools:

```bash
sudo apt-get update && \
  sudo apt-get install -y dotnet-sdk-9.0
```

## 3. Verify Installation
Check the installed version:

```bash
dotnet --version
```

---

# Setting Up CopyQ (Clipboard Manager)

Keep your clipboard history and organize snippets with CopyQ. This is especially useful for managing multiple database connection strings and environment variables across XRDP sessions.

## 1. Install via Terminal 

Open your terminal and run these commands in order: 

### Add the Repository
```bash
sudo add-apt-repository ppa:hluk/copyq -y
```

### Update Your Packages
```bash
sudo apt update
```

### Install CopyQ
```bash
sudo apt install copyq -y
```

## 2. Initial Setup
After installation, launch and configure it to run automatically: 

- **Launch:** Open your Applications menu, search for **CopyQ**, and click to open it.
- **Enable Autostart:**
    1. Right-click the CopyQ icon in your system tray (top right of the screen).
    2. Select **Preferences** > **General**.
    3. Check the box for **Autostart** so it launches every time you log in. 

## 3. Set a Global Shortcut (Super + V) 
Since Ubuntu uses the GNOME desktop, setting a shortcut inside CopyQ sometimes fails. It is best to set it in Ubuntu Settings: 

1. Open **Settings** > **Keyboard** > **View and Customise Shortcuts**.
2. Scroll to **Custom Shortcuts** and click the **+** (plus) icon.
3. Fill in the following:
  - **Name:** `CopyQ Toggle`
  - **Command:** `copyq toggle`
  - **Shortcut:** Press **Super (Windows key) + V**.
4. Click **Add**. 

# Installing Antigravity (IDE & Agent Manager)

This section explains how the Antigravity IDE and Antigravity Agent Manager are installed on Ubuntu, their directory structures, execution privileges, and how to use the automated setup/update script.

## 1. Directory Structure and Execution Layout

Antigravity consists of two distinct components, both packaged as Electron applications and located in `/opt/`:

- **Antigravity IDE**:
  - Binaries location: `/opt/antigravity-ide/`
  - Main executable: `/opt/antigravity-ide/antigravity-ide`
- **Antigravity Agent Manager**:
  - Binaries location: `/opt/antigravity/`
  - Main executable: `/opt/antigravity/antigravity`

## 2. Setting Up Sandbox Permissions

Electron applications running on Linux require a setuid sandbox binary (`chrome-sandbox`) to isolate untrusted web contents. For the sandbox to function properly without crash issues, the binary must be owned by `root` and have `4755` permissions:

```bash
# Fix permissions for Antigravity IDE
sudo chown root:root /opt/antigravity-ide/chrome-sandbox
sudo chmod 4755 /opt/antigravity-ide/chrome-sandbox

# Fix permissions for Antigravity Agent Manager
sudo chown root:root /opt/antigravity/chrome-sandbox
sudo chmod 4755 /opt/antigravity/chrome-sandbox
```

## 3. Desktop and Menu Shortcuts

To launch these applications conveniently, desktop shortcut files (`.desktop`) are registered in the user's local application folder (`~/.local/share/applications/`) and on the Desktop (`~/Desktop/`).

### Desktop Shortcut Structure for Antigravity IDE
Create `~/.local/share/applications/antigravity-ide.desktop` and `~/Desktop/antigravity-ide.desktop` with the following content:

```ini
[Desktop Entry]
Name=Antigravity IDE
Comment=Antigravity Code Editor
Exec="/opt/antigravity-ide/antigravity-ide" %F
Icon=/usr/share/pixmaps/antigravity.png
Type=Application
Terminal=false
StartupNotify=true
StartupWMClass=Antigravity IDE
Categories=Development;IDE;TextEditor;
```

### Desktop Shortcut Structure for Antigravity Agent Manager
Create `~/.local/share/applications/antigravity-agent-manager.desktop` and `~/Desktop/antigravity-agent-manager.desktop` with the following content:

```ini
[Desktop Entry]
Name=Antigravity Agent Manager
Comment=Antigravity Agentic Workspace Platform
GenericName=Agent Manager
Exec=/opt/antigravity/antigravity %F
Icon=antigravity
Type=Application
Terminal=false
StartupNotify=true
StartupWMClass=Antigravity
Categories=Development;IDE;
```

### Trusting Desktop Shortcuts (GNOME)
On Ubuntu's GNOME desktop environment, you must make the desktop shortcut files executable and mark them as trusted. Otherwise, they will show a lock/unsafe icon and refuse to run:

```bash
# Make shortcuts executable
chmod +x ~/.local/share/applications/antigravity-*.desktop
chmod +x ~/Desktop/antigravity-*.desktop

# Trust them using GNOME's GIO utility
gio set ~/Desktop/antigravity-ide.desktop metadata::trusted true
gio set ~/Desktop/antigravity-agent-manager.desktop metadata::trusted true
```

## 4. Automating with the Install/Update Script

A unified installation and update script is provided in `setupscripts/install-antigravity.sh`. It automatically handles directory cleanups, extraction, sandbox permissions, shortcut generation, icon download/installation, and configuration migration.

> [!NOTE]
> **Package Manager Fallback**: If the local archive file for the Antigravity Agent Manager (`Antigravity.tar.gz`) is not found, the script will automatically register the official Google Artifact Registry APT repository (`https://us-central1-apt.pkg.dev/projects/antigravity-auto-updater-dev/`) and install/update the `antigravity` package via `apt`.

### How to Run the Script

1. Make sure you have downloaded the latest archives (`Antigravity.tar.gz` and/or `Antigravity IDE.tar.gz`) to your `~/Downloads` or the repository folder. If the Agent archive is not present, it will be downloaded/installed via the package manager.
2. Run the script as a regular user (with sudo privileges):

```bash
# Run the installation (automatically searches for archives in ~/Downloads)
bash setupscripts/install-antigravity.sh

# You can also pass direct paths to the archive files
bash setupscripts/install-antigravity.sh --ide-archive "~/Downloads/Antigravity IDE.tar.gz" --agent-archive "~/Downloads/Antigravity.tar.gz"

# Or restrict the setup to one component only
bash setupscripts/install-antigravity.sh --ide-only
bash setupscripts/install-antigravity.sh --agent-only
```

---

### Summary Checklist for New Machines

- **Groups:** Ensure user is in `video` and `render`.
- **Devices:** Map `/dev/kfd` and `/dev/dri`.
- **Env Var:** Always include `HSA_OVERRIDE_GFX_VERSION=8.0.3`.
- **Engine:** Use `OLLAMA_VULKAN=1`.

This setup is now "production-ready" for your local environment. It's isolated, high-performance, and won't be broken by Ubuntu system updates.

---

