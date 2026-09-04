#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "=== DeepLens Store Quality & Typecheck Gate ==="

echo "1. Checking Store App TypeScript..."
cd "${ROOT_DIR}/src/apps/store"
npx tsc --noEmit
echo "   -> Store App: PASSED"

echo "2. Checking Shared UI Package TypeScript..."
cd "${ROOT_DIR}/src/packages/ui"
npx tsc --noEmit
echo "   -> Shared UI: PASSED"

echo "3. Checking Store.Api .NET build..."
cd "${ROOT_DIR}"
dotnet build src/services/Store.Api/Store.Api.csproj
echo "   -> Store.Api: PASSED"

echo "=== All Store Quality Checks Passed Successfully! ==="
