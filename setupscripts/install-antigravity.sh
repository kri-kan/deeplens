#!/usr/bin/env bash
#
# Antigravity IDE & Agent Installation and Update Script for Ubuntu
#
# This script automates:
# 1. Searching for local Antigravity installation tarballs in ~/Downloads, the current folder, or a custom directory.
# 2. Extracting the binaries to /opt/antigravity-ide and /opt/antigravity.
# 3. Setting critical Electron chrome-sandbox permissions (root:root, 4755).
# 4. Copying and configuring application icons in /usr/share/pixmaps.
# 5. Installing user and desktop shortcuts (.desktop files) and trusting them via GNOME's GIO.
# 6. Migrating settings and extensions from older Antigravity layouts to the IDE.
#
# Usage:
#   bash install-antigravity.sh [options]
#
# Options:
#   -d, --dir <path>       Directory to search for installation archives (default: ~/Downloads and current dir)
#   --ide-archive <path>   Path to the Antigravity IDE tarball
#   --agent-archive <path> Path to the Antigravity Agent tarball
#   --ide-only             Only install/update the Antigravity IDE
#   --agent-only           Only install/update the Antigravity Agent Manager
#   -h, --help             Show this help message

set -euo pipefail

# --- Color formatting helper ---
info() { echo -e "\e[34m[INFO]\e[0m $*"; }
success() { echo -e "\e[32m[SUCCESS]\e[0m $*"; }
warn() { echo -e "\e[33m[WARNING]\e[0m $*"; }
error() { echo -e "\e[31m[ERROR]\e[0m $*"; exit 1; }

# --- Default Values ---
SEARCH_DIR=""
IDE_ARCHIVE=""
AGENT_ARCHIVE=""
INSTALL_IDE=true
INSTALL_AGENT=true
AGENT_INSTALL_METHOD="tarball"
USER_HOME="${HOME:-/home/$(logname)}"
ACTUAL_USER="${SUDO_USER:-$(whoami)}"

show_help() {
    cat <<EOF
Usage: $(basename "$0") [options]

Options:
  -d, --dir <path>       Directory to search for installation archives (default: ~/Downloads and current directory)
  --ide-archive <path>   Direct path to the Antigravity IDE tarball (e.g., Antigravity IDE.tar.gz)
  --agent-archive <path> Direct path to the Antigravity Agent tarball (e.g., Antigravity.tar.gz)
  --ide-only             Only install/update the Antigravity IDE
  --agent-only           Only install/update the Antigravity Agent Manager
  -h, --help             Show this help message
EOF
}

# --- Parse Arguments ---
while [[ $# -gt 0 ]]; do
    case "$1" in
        -d|--dir)
            SEARCH_DIR="$2"
            shift 2
            ;;
        --ide-archive)
            IDE_ARCHIVE="$2"
            shift 2
            ;;
        --agent-archive)
            AGENT_ARCHIVE="$2"
            shift 2
            ;;
        --ide-only)
            INSTALL_AGENT=false
            shift
            ;;
        --agent-only)
            INSTALL_IDE=false
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            error "Unknown argument: $1\nUse --help for usage details."
            ;;
    esac
done

# --- Sudo check ---
# Note: The script should be run as a regular user who has sudo privileges,
# so that we know which user's home directory (~/Desktop, ~/.local/share/applications) to install shortcuts into.
if [ "$(id -u)" -eq 0 ]; then
    if [ -z "${SUDO_USER:-}" ]; then
        error "Do not run this script directly as root. Run it as a regular user with sudo privileges: e.g., 'bash install-antigravity.sh'"
    fi
fi

# Ensure sudo credentials are valid
info "Checking sudo privileges..."
sudo -v

# --- Check for running instances ---
if pgrep -x "antigravity" >/dev/null 2>&1 || pgrep -f "/opt/antigravity/antigravity" >/dev/null 2>&1; then
    warn "The Antigravity Agent Manager is currently running."
    info "The update will be applied to the disk, but you must restart the Agent Manager after this script completes to run the new version."
fi

if pgrep -x "antigravity-ide" >/dev/null 2>&1 || pgrep -f "/opt/antigravity-ide/antigravity-ide" >/dev/null 2>&1; then
    warn "The Antigravity IDE is currently running."
    info "The update will be applied to the disk, but you must restart the IDE after this script completes to run the new version."
fi

# --- Locate archives ---
cleanup_old_archives() {
    info "Checking for stale installation archives older than 1 day..."
    # Clean up old files in ~/Downloads to prevent reinstalling outdated versions
    find "$USER_HOME/Downloads" -maxdepth 1 -iname "*Antigravity*.tar.gz" -mtime +1 -exec rm -f {} \; 2>/dev/null || true
    find . -maxdepth 1 -iname "*Antigravity*.tar.gz" -mtime +1 -exec rm -f {} \; 2>/dev/null || true
}
cleanup_old_archives

find_archive() {
    local pattern="$1"
    local desc="$2"
    local found=""

    # 1. Check if direct path was provided
    if [ -n "$3" ]; then
        if [ -f "$3" ]; then
            echo "$3"
            return 0
        else
            error "Specified $desc path not found: $3"
        fi
    fi

    # 2. Check SEARCH_DIR if specified
    if [ -n "$SEARCH_DIR" ]; then
        found=$(find "$SEARCH_DIR" -maxdepth 1 -iname "$pattern" -print -quit 2>/dev/null || true)
        if [ -n "$found" ]; then
            echo "$found"
            return 0
        fi
    fi

    # 3. Check current directory
    found=$(find . -maxdepth 1 -iname "$pattern" -print -quit 2>/dev/null || true)
    if [ -n "$found" ]; then
        echo "$found"
        return 0
    fi

    # 4. Check ~/Downloads
    found=$(find "$USER_HOME/Downloads" -maxdepth 1 -iname "$pattern" -print -quit 2>/dev/null || true)
    if [ -n "$found" ]; then
        echo "$found"
        return 0
    fi

    echo ""
}

# --- Resolve Archives ---
if [ "$INSTALL_IDE" = true ]; then
    IDE_ARCHIVE_PATH=$(find_archive "*Antigravity*IDE*.tar.gz" "Antigravity IDE archive" "$IDE_ARCHIVE")
    if [ -z "$IDE_ARCHIVE_PATH" ]; then
        warn "Could not locate Antigravity IDE archive (e.g., 'Antigravity IDE.tar.gz')"
        if [ "$INSTALL_AGENT" = false ]; then
            error "IDE-only install requested, but archive was not found."
        fi
        INSTALL_IDE=false
    else
        info "Found Antigravity IDE archive at: $IDE_ARCHIVE_PATH"
    fi
fi

if [ "$INSTALL_AGENT" = true ]; then
    AGENT_ARCHIVE_PATH=$(find_archive "Antigravity.tar.gz" "Antigravity Agent archive" "$AGENT_ARCHIVE")
    # Also fallback to match pattern *Antigravity.tar.gz or Antigravity-*.tar.gz
    if [ -z "$AGENT_ARCHIVE_PATH" ]; then
        AGENT_ARCHIVE_PATH=$(find_archive "*Antigravity*.tar.gz" "Antigravity Agent archive" "$AGENT_ARCHIVE")
    fi

    if [ -z "$AGENT_ARCHIVE_PATH" ]; then
        warn "Could not locate Antigravity Agent archive (e.g., 'Antigravity.tar.gz')"
        info "Falling back to APT package manager to install/update the Antigravity Agent Manager..."
        AGENT_INSTALL_METHOD="apt"
        AGENT_ARCHIVE_PATH=""
    else
        # Make sure it's not the same file as the IDE archive if both matched generic patterns
        if [ "${INSTALL_IDE}" = true ] && [ "$AGENT_ARCHIVE_PATH" = "$IDE_ARCHIVE_PATH" ]; then
            # Re-evaluate agent search, skipping the IDE path
            warn "Agent and IDE resolved to the same archive file. Falling back to APT package manager for Agent."
            AGENT_INSTALL_METHOD="apt"
            AGENT_ARCHIVE_PATH=""
        else
            info "Found Antigravity Agent archive at: $AGENT_ARCHIVE_PATH"
            AGENT_INSTALL_METHOD="tarball"
        fi
    fi
fi

if [ "$INSTALL_IDE" = false ] && [ "$INSTALL_AGENT" = false ]; then
    error "No archives found to install/update. Please place the tar.gz files in ~/Downloads or the current directory, or specify them using --ide-archive and --agent-archive."
fi

# --- Create Temp Directory for extraction ---
TEMP_DIR=$(mktemp -d -t antigravity-install-XXXXXX)
trap 'rm -rf "$TEMP_DIR"' EXIT

# --- Install / Update Antigravity IDE ---
install_ide() {
    info "Installing/Updating Antigravity IDE..."
    
    # 1. Extract archive to temp directory
    info "Extracting $IDE_ARCHIVE_PATH..."
    tar -xzf "$IDE_ARCHIVE_PATH" -C "$TEMP_DIR"

    # 2. Locate extracted directory (could be named "Antigravity IDE", "Antigravity-IDE-x64", etc.)
    local extracted_dir=""
    extracted_dir=$(find "$TEMP_DIR" -mindepth 1 -maxdepth 1 -type d -name "*Antigravity*IDE*" -o -name "*Antigravity-IDE*" -print -quit || true)
    if [ -z "$extracted_dir" ]; then
        # Fallback to any directory that is not empty
        extracted_dir=$(find "$TEMP_DIR" -mindepth 1 -maxdepth 1 -type d -print -quit || true)
    fi
    [ -n "$extracted_dir" ] || error "Failed to find extracted IDE directory in temp path."

    # 3. Clean up older installation
    if [ -d "/opt/antigravity-ide" ]; then
        info "Backing up existing IDE installation to /opt/antigravity-ide.bak..."
        sudo rm -rf /opt/antigravity-ide.bak
        sudo mv /opt/antigravity-ide /opt/antigravity-ide.bak
    fi

    # 4. Move extracted content to /opt
    info "Moving installation files to /opt/antigravity-ide..."
    sudo mkdir -p /opt/antigravity-ide
    sudo mv "$extracted_dir"/* /opt/antigravity-ide/
    
    # 5. Fix Electron Chrome Sandbox permissions (Critical for launching on Linux)
    if [ -f "/opt/antigravity-ide/chrome-sandbox" ]; then
        info "Setting permissions on chrome-sandbox..."
        sudo chown root:root /opt/antigravity-ide/chrome-sandbox
        sudo chmod 4755 /opt/antigravity-ide/chrome-sandbox
    fi

    success "Antigravity IDE binaries installed to /opt/antigravity-ide"
}

# --- Install / Update Antigravity Agent Manager ---
install_agent() {
    info "Installing/Updating Antigravity Agent Manager..."
    
    if [ "$AGENT_INSTALL_METHOD" = "apt" ]; then
        info "Setting up Antigravity APT repository..."
        
        # 1. Download signing key
        info "Downloading repo signing key..."
        sudo mkdir -p /etc/apt/keyrings
        curl -fsSL https://us-central1-apt.pkg.dev/doc/repo-signing-key.gpg | sudo gpg --dearmor --yes -o /etc/apt/keyrings/antigravity-repo-key.gpg
        
        # 2. Register repository in sources.list.d
        info "Adding repository configuration to /etc/apt/sources.list.d/antigravity.list..."
        echo "deb [signed-by=/etc/apt/keyrings/antigravity-repo-key.gpg] https://us-central1-apt.pkg.dev/projects/antigravity-auto-updater-dev/ antigravity-debian main" | sudo tee /etc/apt/sources.list.d/antigravity.list > /dev/null
        
        # 3. Update and install
        info "Updating packages and installing 'antigravity'..."
        sudo apt-get update
        sudo apt-get install -y antigravity
    else
        # Clear temp folder contents for agent extraction
        rm -rf "${TEMP_DIR:?}"/*

        # 1. Extract archive to temp directory
        info "Extracting $AGENT_ARCHIVE_PATH..."
        tar -xzf "$AGENT_ARCHIVE_PATH" -C "$TEMP_DIR"

        # 2. Locate extracted directory (could be named "Antigravity-x64", "Antigravity", etc.)
        local extracted_dir=""
        extracted_dir=$(find "$TEMP_DIR" -mindepth 1 -maxdepth 1 -type d -name "*Antigravity*" ! -name "*IDE*" -print -quit || true)
        if [ -z "$extracted_dir" ]; then
            extracted_dir=$(find "$TEMP_DIR" -mindepth 1 -maxdepth 1 -type d -print -quit || true)
        fi
        [ -n "$extracted_dir" ] || error "Failed to find extracted Agent directory in temp path."

        # 3. Clean up older installation
        if [ -d "/opt/antigravity" ]; then
            info "Backing up existing Agent installation to /opt/antigravity.bak..."
            sudo rm -rf /opt/antigravity.bak
            sudo mv /opt/antigravity /opt/antigravity.bak
        fi

        # 4. Move extracted content to /opt
        info "Moving installation files to /opt/antigravity..."
        sudo mkdir -p /opt/antigravity
        sudo mv "$extracted_dir"/* /opt/antigravity/
    fi
    
    # 5. Fix Electron Chrome Sandbox permissions
    if [ -f "/opt/antigravity/chrome-sandbox" ]; then
        info "Setting permissions on chrome-sandbox..."
        sudo chown root:root /opt/antigravity/chrome-sandbox
        sudo chmod 4755 /opt/antigravity/chrome-sandbox
    fi

    success "Antigravity Agent Manager binaries installed/updated successfully"
}

# --- Install Icons ---
setup_icons() {
    info "Configuring application icons..."
    local local_icon="$USER_HOME/Downloads/antigravity.png"
    local target_icon="/usr/share/pixmaps/antigravity.png"

    if [ -f "$local_icon" ]; then
        info "Copying icon from $local_icon to $target_icon..."
        sudo cp "$local_icon" "$target_icon"
    elif [ ! -f "$target_icon" ]; then
        info "Icon not found locally. Attempting to download icon from https://antigravity.google..."
        if command -v curl >/dev/null; then
            sudo curl -fsSL -o "$target_icon" https://antigravity.google || warn "Failed to download icon using curl."
        elif command -v wget >/dev/null; then
            sudo wget -q -O "$target_icon" https://antigravity.google || warn "Failed to download icon using wget."
        else
            warn "Neither curl nor wget is installed. Could not download icon."
        fi
    fi

    # Ensure icon has correct read permissions
    if [ -f "$target_icon" ]; then
        sudo chmod 644 "$target_icon"
    fi
}

# --- Install Desktop Shortcuts ---
setup_shortcuts() {
    info "Setting up desktop shortcuts..."
    local applications_dir="$USER_HOME/.local/share/applications"
    local desktop_dir="$USER_HOME/Desktop"

    mkdir -p "$applications_dir"
    mkdir -p "$desktop_dir"

    # 1. Antigravity IDE Desktop Shortcut
    if [ "$INSTALL_IDE" = true ]; then
        info "Creating Antigravity IDE shortcuts..."
        cat <<EOF > "$TEMP_DIR/antigravity-ide.desktop"
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
EOF

        # Copy to applications and Desktop
        cp "$TEMP_DIR/antigravity-ide.desktop" "$applications_dir/antigravity-ide.desktop"
        cp "$TEMP_DIR/antigravity-ide.desktop" "$desktop_dir/antigravity-ide.desktop"
        
        # Make them executable and trust them
        chmod +x "$applications_dir/antigravity-ide.desktop"
        chmod +x "$desktop_dir/antigravity-ide.desktop"
        
        # Set permissions for the actual user
        chown "$ACTUAL_USER:$ACTUAL_USER" "$applications_dir/antigravity-ide.desktop" "$desktop_dir/antigravity-ide.desktop"

        # Trust on GNOME
        sudo -u "$ACTUAL_USER" DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$(id -u "$ACTUAL_USER")/bus" gio set "$desktop_dir/antigravity-ide.desktop" metadata::trusted true 2>/dev/null || \
        gio set "$desktop_dir/antigravity-ide.desktop" metadata::trusted true 2>/dev/null || true
    fi

    # 2. Antigravity Agent Manager Desktop Shortcut
    if [ "$INSTALL_AGENT" = true ]; then
        info "Creating Antigravity Agent Manager shortcuts..."
        cat <<EOF > "$TEMP_DIR/antigravity-agent-manager.desktop"
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
EOF

        # Copy to applications and Desktop
        cp "$TEMP_DIR/antigravity-agent-manager.desktop" "$applications_dir/antigravity-agent-manager.desktop"
        cp "$TEMP_DIR/antigravity-agent-manager.desktop" "$desktop_dir/antigravity-agent-manager.desktop"
        
        # Make them executable and trust them
        chmod +x "$applications_dir/antigravity-agent-manager.desktop"
        chmod +x "$desktop_dir/antigravity-agent-manager.desktop"

        # Set permissions for the actual user
        chown "$ACTUAL_USER:$ACTUAL_USER" "$applications_dir/antigravity-agent-manager.desktop" "$desktop_dir/antigravity-agent-manager.desktop"

        # Trust on GNOME
        sudo -u "$ACTUAL_USER" DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$(id -u "$ACTUAL_USER")/bus" gio set "$desktop_dir/antigravity-agent-manager.desktop" metadata::trusted true 2>/dev/null || \
        gio set "$desktop_dir/antigravity-agent-manager.desktop" metadata::trusted true 2>/dev/null || true
    fi
}

# --- Settings & Extensions Migration ---
migrate_settings() {
    info "Checking for settings migration..."
    
    # 1. Migrate extensions
    if [ -d "$USER_HOME/.antigravity/extensions" ] && [ ! -d "$USER_HOME/.antigravity-ide/extensions" ]; then
        info "Migrating extensions from ~/.antigravity/extensions to ~/.antigravity-ide/extensions..."
        mkdir -p "$USER_HOME/.antigravity-ide"
        cp -r "$USER_HOME/.antigravity/extensions" "$USER_HOME/.antigravity-ide/extensions"
        chown -R "$ACTUAL_USER:$ACTUAL_USER" "$USER_HOME/.antigravity-ide"
        success "Extensions migrated successfully."
    fi

    # 2. Migrate settings.json
    local source_settings="$USER_HOME/.config/Antigravity/User/settings.json"
    local dest_dir="$USER_HOME/.config/Antigravity IDE/User"
    local dest_settings="$dest_dir/settings.json"

    if [ -f "$source_settings" ] && [ ! -f "$dest_settings" ]; then
        info "Migrating user settings.json to Antigravity IDE configuration..."
        mkdir -p "$dest_dir"
        cp "$source_settings" "$dest_settings"
        chown -R "$ACTUAL_USER:$ACTUAL_USER" "$USER_HOME/.config/Antigravity IDE"
        success "Settings migrated successfully."
    fi
}

# --- Execution ---
if [ "$INSTALL_IDE" = true ]; then
    install_ide
fi

if [ "$INSTALL_AGENT" = true ]; then
    install_agent
fi

setup_icons
setup_shortcuts
setup_symlinks() {
    info "Setting up terminal symlinks in ~/.local/bin..."
    mkdir -p "$USER_HOME/.local/bin"
    if [ "$INSTALL_IDE" = true ]; then
        ln -sf /opt/antigravity-ide/antigravity-ide "$USER_HOME/.local/bin/antigravity-ide"
    fi
    if [ "$INSTALL_AGENT" = true ] && [ "$AGENT_INSTALL_METHOD" != "apt" ]; then
        ln -sf /opt/antigravity/antigravity "$USER_HOME/.local/bin/antigravity"
    fi
}
setup_symlinks
migrate_settings

info "Killing stuck background processes..."
pkill -f "antigravity" || true

success "Antigravity setup completed successfully!"
echo "--------------------------------------------------------"
echo "Starting applications..."

if [ "$INSTALL_IDE" = true ]; then
    info "Starting Antigravity IDE..."
    nohup /opt/antigravity-ide/antigravity-ide >/dev/null 2>&1 &
fi

if [ "$INSTALL_AGENT" = true ]; then
    info "Starting Antigravity Agent Manager..."
    nohup /opt/antigravity/antigravity >/dev/null 2>&1 &
fi

echo "--------------------------------------------------------"
