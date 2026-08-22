#!/usr/bin/env bash
# =============================================================================
# DeepLens AI Tools Bootstrap & Setup Script
# Stack:
#   1. DeusData codebase-memory-mcp (Repository Intelligence)
#   2. Serena MCP + Language Servers (Semantic Code Intelligence)
#   3. crystaldba/postgres-mcp in restricted mode (Database Intelligence)
# =============================================================================

set -euo pipefail

BOLD="\033[1m"
GREEN="\033[0;32m"
BLUE="\033[0;34m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
NC="\033[0m"

log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
USER_HOME="${HOME:-$(eval echo ~)}"
LOCAL_BIN="${USER_HOME}/.local/bin"
DOTNET_TOOLS="${USER_HOME}/.dotnet/tools"

mkdir -p "${LOCAL_BIN}"
export PATH="${LOCAL_BIN}:${DOTNET_TOOLS}:${PATH}"

echo -e "${BOLD}======================================================${NC}"
echo -e "${BOLD}🚀 Initializing DeepLens AI Tools & MCP Stack Setup${NC}"
echo -e "${BOLD}======================================================${NC}"
log_info "Workspace: ${WORKSPACE_ROOT}"
log_info "User Home: ${USER_HOME}"

# 1. Runtime Environment Verification
echo ""
echo -e "${BOLD}🔍 Step 1: Checking Base Runtimes...${NC}"

if command -v node >/dev/null 2>&1; then
    log_success "Node.js found: $(node --version)"
else
    log_error "Node.js is not installed. Please install Node.js (>= 18.0.0)."
    exit 1
fi

if command -v npm >/dev/null 2>&1; then
    log_success "NPM found: $(npm --version)"
else
    log_error "NPM is not installed."
    exit 1
fi

if command -v python3 >/dev/null 2>&1; then
    log_success "Python found: $(python3 --version)"
else
    log_error "Python 3 is not installed. Please install Python (>= 3.10)."
    exit 1
fi

if command -v dotnet >/dev/null 2>&1; then
    log_success ".NET SDK found: $(dotnet --version)"
else
    log_warn ".NET SDK not found in PATH."
fi

if command -v docker >/dev/null 2>&1; then
    log_success "Docker found: $(docker --version)"
else
    log_warn "Docker not found in PATH."
fi

# 2. Node.js MCP & Language Server Tool Installation
echo ""
echo -e "${BOLD}📦 Step 2: Installing Global Node.js Language Servers & MCP Tools...${NC}"

NPM_PACKAGES=(
    "codebase-memory-mcp"
    "typescript"
    "typescript-language-server"
    "pyright"
    "vscode-langservers-extracted"
    "@bradygaster/squad-cli@0.11.0"
)

for pkg in "${NPM_PACKAGES[@]}"; do
    log_info "Installing / updating npm package: ${pkg}..."
    if npm install -g "${pkg}" >/dev/null 2>&1; then
        log_success "Installed ${pkg}"
    else
        log_warn "Global npm install failed for ${pkg}. Will rely on npx fallback."
    fi
done

# 3. .NET C# Language Server & Tools Installation
echo ""
echo -e "${BOLD}🛠️ Step 3: Installing .NET Tools & C# Language Server...${NC}"

if command -v dotnet >/dev/null 2>&1; then
    if ! command -v csharp-ls >/dev/null 2>&1; then
        log_info "Installing dotnet tool: csharp-ls..."
        dotnet tool install -g csharp-ls >/dev/null 2>&1 || log_warn "csharp-ls install warning or already installed."
    else
        log_success "csharp-ls is already installed: $(command -v csharp-ls)"
    fi

    if ! command -v dotnet-roslyn-mcp >/dev/null 2>&1; then
        log_info "Installing dotnet tool: dotnet-roslyn-mcp..."
        dotnet tool install -g dotnet-roslyn-mcp >/dev/null 2>&1 || log_warn "dotnet-roslyn-mcp install warning or already installed."
    else
        log_success "dotnet-roslyn-mcp is already installed: $(command -v dotnet-roslyn-mcp)"
    fi
fi

# 4. Python UV & Serena MCP Setup
echo ""
echo -e "${BOLD}🐍 Step 4: Installing UV & Serena MCP Agent...${NC}"

if ! command -v uv >/dev/null 2>&1 && ! command -v uvx >/dev/null 2>&1; then
    log_info "Installing uv package manager..."
    if curl -LsSf https://astral.sh/uv/install.sh | sh >/dev/null 2>&1; then
        log_success "Installed uv via Astral installer into ${LOCAL_BIN}"
    elif python3 -m pip install --user --break-system-packages uv >/dev/null 2>&1; then
        log_success "Installed uv via user pip"
    else
        log_warn "Could not install uv automatically. Serena will be run via python3 / pipx."
    fi
else
    log_success "uv/uvx is available: $(command -v uv 2>/dev/null || command -v uvx)"
fi

# 5. PostgreSQL MCP Docker Image Pull (Restricted Mode)
echo ""
echo -e "${BOLD}🐘 Step 5: Preparing crystaldba/postgres-mcp Docker Image...${NC}"

if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    log_info "Pulling crystaldba/postgres-mcp image..."
    if docker pull crystaldba/postgres-mcp:latest >/dev/null 2>&1; then
        log_success "Pulled crystaldba/postgres-mcp:latest"
    else
        log_warn "Could not pull crystaldba/postgres-mcp:latest (check network or Docker daemon)."
    fi
fi

# 6. Monorepo Configuration Check
echo ""
echo -e "${BOLD}⚙️ Step 6: Validating Monorepo Configuration Artifacts...${NC}"

if [ -f "${WORKSPACE_ROOT}/.codebase-memory.json" ]; then
    log_success "Found ${WORKSPACE_ROOT}/.codebase-memory.json"
else
    log_warn "Missing .codebase-memory.json in workspace root."
fi

if [ -f "${WORKSPACE_ROOT}/.cbmignore" ]; then
    log_success "Found ${WORKSPACE_ROOT}/.cbmignore"
else
    log_warn "Missing .cbmignore in workspace root."
fi

if [ -f "${WORKSPACE_ROOT}/.serena/project.yml" ]; then
    log_success "Found ${WORKSPACE_ROOT}/.serena/project.yml"
else
    log_warn "Missing .serena/project.yml in workspace root."
fi

echo ""
echo -e "${BOLD}======================================================${NC}"
echo -e "${GREEN}✨ DeepLens AI Tools Bootstrap Finished Successfully!${NC}"
echo -e "${BOLD}======================================================${NC}"
echo ""
