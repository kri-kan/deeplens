#!/usr/bin/env bash
# =============================================================================
# DeepLens AI Tools & MCP Stack Verification Script
# =============================================================================

set -uo pipefail

BOLD="\033[1m"
GREEN="\033[0;32m"
BLUE="\033[0;34m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
NC="\033[0m"

PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0

record_pass() {
    echo -e "  [${GREEN}PASS${NC}] $1"
    ((PASS_COUNT++))
}

record_warn() {
    echo -e "  [${YELLOW}WARN${NC}] $1"
    ((WARN_COUNT++))
}

record_fail() {
    echo -e "  [${RED}FAIL${NC}] $1"
    ((FAIL_COUNT++))
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
USER_HOME="${HOME:-$(eval echo ~)}"
LOCAL_BIN="${USER_HOME}/.local/bin"
DOTNET_TOOLS="${USER_HOME}/.dotnet/tools"

export PATH="${LOCAL_BIN}:${DOTNET_TOOLS}:${PATH}"

echo -e "${BOLD}======================================================================${NC}"
echo -e "${BOLD}🔬 DeepLens AI Stack & MCP Verification Matrix${NC}"
echo -e "${BOLD}======================================================================${NC}"
echo -e "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo -e "Workspace: ${WORKSPACE_ROOT}"
echo ""

# 1. Core Runtimes & CLIs
echo -e "${BOLD}1. Core Runtimes & CLIs:${NC}"

if command -v node >/dev/null 2>&1; then
    record_pass "Node.js runtime: $(node --version)"
else
    record_fail "Node.js is missing"
fi

if command -v npm >/dev/null 2>&1; then
    record_pass "NPM package manager: $(npm --version)"
else
    record_fail "NPM is missing"
fi

if command -v python3 >/dev/null 2>&1; then
    record_pass "Python runtime: $(python3 --version 2>&1)"
else
    record_fail "Python 3 is missing"
fi

if command -v dotnet >/dev/null 2>&1; then
    record_pass ".NET SDK runtime: $(dotnet --version)"
else
    record_warn ".NET SDK missing in PATH"
fi

if command -v docker >/dev/null 2>&1; then
    record_pass "Docker CLI: $(docker --version)"
else
    record_warn "Docker CLI not found in PATH"
fi

# 2. LSP Tooling
echo ""
echo -e "${BOLD}2. Language Server Protocol (LSP) Suite:${NC}"

if command -v csharp-ls >/dev/null 2>&1; then
    record_pass "C# Language Server (csharp-ls): $(command -v csharp-ls)"
elif command -v dotnet-roslyn-mcp >/dev/null 2>&1; then
    record_pass "C# Roslyn MCP Server: $(command -v dotnet-roslyn-mcp)"
else
    record_warn "C# LSP (csharp-ls) not found in PATH"
fi

if command -v typescript-language-server >/dev/null 2>&1; then
    record_pass "TypeScript Language Server: $(command -v typescript-language-server)"
else
    record_warn "TypeScript Language Server missing"
fi

if command -v pyright >/dev/null 2>&1; then
    record_pass "Python Language Server (Pyright): $(command -v pyright)"
elif command -v basedpyright >/dev/null 2>&1; then
    record_pass "Python Language Server (basedpyright): $(command -v basedpyright)"
else
    record_warn "Python LSP (pyright) missing"
fi

if command -v vscode-html-language-server >/dev/null 2>&1; then
    record_pass "HTML/CSS Language Servers: $(command -v vscode-html-language-server)"
else
    record_warn "Web Language Servers missing"
fi

# 3. MCP Stack
echo ""
echo -e "${BOLD}3. Model Context Protocol (MCP) Stack:${NC}"

if command -v codebase-memory-mcp >/dev/null 2>&1; then
    record_pass "DeusData codebase-memory-mcp: $(command -v codebase-memory-mcp)"
elif command -v npx >/dev/null 2>&1; then
    record_pass "DeusData codebase-memory-mcp: Available on-demand via npx -y codebase-memory-mcp"
else
    record_fail "codebase-memory-mcp is not available via PATH or npx"
fi

if command -v serena >/dev/null 2>&1; then
    record_pass "Serena MCP CLI: $(command -v serena)"
elif command -v uvx >/dev/null 2>&1; then
    record_pass "Serena MCP: Available on-demand via uvx --from git+https://github.com/oraios/serena serena"
else
    record_warn "Serena MCP CLI not found"
fi

if command -v docker >/dev/null 2>&1; then
    if docker images | grep -q "crystaldba/postgres-mcp"; then
        record_pass "PostgreSQL MCP Docker Image: crystaldba/postgres-mcp present"
    else
        record_warn "PostgreSQL MCP Docker image crystaldba/postgres-mcp not cached locally"
    fi
fi

# 4. Monorepo Configurations
echo ""
echo -e "${BOLD}4. Monorepo Configuration Files & Rules:${NC}"

if [ -f "${WORKSPACE_ROOT}/.codebase-memory.json" ]; then
    record_pass "Found .codebase-memory.json in ${WORKSPACE_ROOT}"
else
    record_fail "Missing .codebase-memory.json in ${WORKSPACE_ROOT}"
fi

if [ -f "${WORKSPACE_ROOT}/.cbmignore" ]; then
    record_pass "Found .cbmignore with build artifact ignore rules in ${WORKSPACE_ROOT}"
else
    record_fail "Missing .cbmignore in ${WORKSPACE_ROOT}"
fi

if [ -f "${WORKSPACE_ROOT}/.serena/project.yml" ]; then
    record_pass "Found .serena/project.yml LSP config in ${WORKSPACE_ROOT}"
else
    record_warn "Missing .serena/project.yml in ${WORKSPACE_ROOT}"
fi

# 5. Summary
echo ""
echo -e "${BOLD}======================================================================${NC}"
echo -e "${BOLD}📊 Verification Summary:${NC}"
echo -e "  Passed: ${GREEN}${PASS_COUNT}${NC}"
echo -e "  Warnings: ${YELLOW}${WARN_COUNT}${NC}"
echo -e "  Failures: ${RED}${FAIL_COUNT}${NC}"
echo -e "${BOLD}======================================================================${NC}"

if [ "${FAIL_COUNT}" -eq 0 ]; then
    echo -e "${GREEN}${BOLD}✅ ALL CRITICAL MCP STACK CHECKS PASSED!${NC}"
    exit 0
else
    echo -e "${RED}${BOLD}❌ CRITICAL CHECKS FAILED.${NC}"
    exit 1
fi
