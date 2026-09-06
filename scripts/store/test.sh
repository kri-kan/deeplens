#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "=== DeepLens Store Quality & Typecheck Gate ==="

echo "1. Checking Vayyari Storefront App TypeScript..."
cd "${ROOT_DIR}/src/store"
npx tsc --noEmit
echo "   -> Vayyari Storefront App: PASSED"

echo "2. Checking Storybook Workbench TypeScript..."
cd "${ROOT_DIR}/src/apps/storybook"
npx tsc --noEmit
echo "   -> Storybook Workbench: PASSED"

echo "3. Checking Shared UI Package TypeScript..."
cd "${ROOT_DIR}/src/packages/ui"
npx tsc --noEmit
echo "   -> Shared UI: PASSED"

echo "4. Checking Store.Api .NET build..."
cd "${ROOT_DIR}"
dotnet build src/services/Store.Api/Store.Api.csproj
echo "   -> Store.Api: PASSED"

echo "=== All Store Quality Checks Passed Successfully! ==="
