#!/usr/bin/env bash
# push-store-update.sh — Export & push Vayyari Store OTA JS bundle to MinIO
# Part of DeepLens Mobile OTA Architecture
#
# Usage:
#   ./scripts/store/push-store-update.sh [--notes "Release notes text"]
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
STORE_DIR="$ROOT_DIR/src/store"

MINIO_ALIAS="local"
MINIO_BUCKET="store-updates"
BUNDLES_PREFIX="bundles"
BASE_URL="http://krikanserver.taild227d9.ts.net/store-updates"
KEEP_VERSIONS=5

RELEASE_NOTES="No release notes provided."
while [[ $# -gt 0 ]]; do
  case "$1" in
    --notes)
      RELEASE_NOTES="$2"
      shift 2
      ;;
    --notes=*)
      RELEASE_NOTES="${1#--notes=}"
      shift
      ;;
    -h|--help)
      grep "^#" "$0" | head -30 | sed 's/^# \?//'
      exit 0
      ;;
    *)
      echo "❌  Unknown argument: $1" >&2
      echo "Usage: $0 [--notes \"Release notes\"]" >&2
      exit 1
      ;;
  esac
done

step() { echo ""; echo "🔷  $*"; }
ok()   { echo "   ✅  $*"; }
info() { echo "   ℹ️   $*"; }
warn() { echo "   ⚠️   $*" >&2; }
die()  { echo ""; echo "❌  $*" >&2; exit 1; }

# ─── Version calculation ──────────────────────────────────────────────────────
BASE_VERSION="1.0.0"
if [[ -f "$STORE_DIR/app.json" ]]; then
  EXTRACTED_VER=$(grep -o '"version": *"[^"]*"' "$STORE_DIR/app.json" | head -1 | cut -d'"' -f4 || true)
  if [[ -n "$EXTRACTED_VER" ]]; then
    BASE_VERSION="$EXTRACTED_VER"
  fi
fi

COMMIT_COUNT=$(git rev-list --count HEAD -- "$STORE_DIR" 2>/dev/null || echo "1")
SHORT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "dev")
DIRTY_FLAG=""
if [[ -n "$(git status --porcelain "$STORE_DIR" 2>/dev/null)" ]]; then
  DIRTY_FLAG="-dirty"
fi

VERSION="${BASE_VERSION}.${COMMIT_COUNT}${DIRTY_FLAG}"
PUBLISHED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# ─── Locate MinIO Client (mc) ─────────────────────────────────────────────────
step "Preflight: verifying MinIO"
find_mc() {
  local candidates=(
    "$HOME/bin/mc"
    "$HOME/.local/bin/mc"
    "/usr/local/bin/mc"
    "/opt/minio/mc"
    "/snap/bin/mc"
  )
  if command -v mc &>/dev/null; then
    local mc_path
    mc_path="$(command -v mc)"
    if "$mc_path" --version 2>/dev/null | grep -qi "minio\|RELEASE"; then
      echo "$mc_path"; return 0
    fi
  fi
  for candidate in "${candidates[@]}"; do
    if [[ -x "$candidate" ]]; then
      if "$candidate" --version 2>/dev/null | grep -qi "minio\|RELEASE"; then
        echo "$candidate"; return 0
      fi
    fi
  done
  return 1
}

MC=""
if ! MC="$(find_mc)"; then
  die "MinIO Client (mc) not found."
fi

if ! "$MC" ls "${MINIO_ALIAS}/${MINIO_BUCKET}" &>/dev/null; then
  info "Bucket '${MINIO_BUCKET}' not found, creating it..."
  "$MC" mb "${MINIO_ALIAS}/${MINIO_BUCKET}"
  "$MC" anonymous set download "${MINIO_ALIAS}/${MINIO_BUCKET}"
fi
ok "MinIO connected, bucket '${MINIO_BUCKET}' verified"

# ─── Step 1: Export Android Bundle ───────────────────────────────────────────
step "Exporting Store Android bundle [${VERSION}]"
cd "$STORE_DIR"

if [[ -d "dist-ota" ]]; then
  rm -rf dist-ota
fi

npx expo export --platform android --output-dir dist-ota
ok "Expo export complete"

BUNDLE_FILE=""
BUNDLE_FILE="${BUNDLE_FILE:-$(find dist-ota/_expo/static/js/android -name "*.hbc" -type f 2>/dev/null | sort | tail -1)}"
BUNDLE_FILE="${BUNDLE_FILE:-$(find dist-ota -name "*.hbc" -type f 2>/dev/null | sort | tail -1)}"
BUNDLE_FILE="${BUNDLE_FILE:-$(find dist-ota -name "index.bundle" -type f 2>/dev/null | head -1)}"
BUNDLE_FILE="${BUNDLE_FILE:-$(find dist-ota -name "*.bundle" -type f 2>/dev/null | sort | tail -1)}"

if [[ -z "$BUNDLE_FILE" ]]; then
  die "No bundle file found in dist-ota/."
fi

ok "Bundle located: ${BUNDLE_FILE} ($(du -sh "$BUNDLE_FILE" | cut -f1))"

ASSETS_DIR="dist-ota/assets"
ASSET_COUNT=0
[[ -d "$ASSETS_DIR" ]] && ASSET_COUNT="$(find "$ASSETS_DIR" -type f | wc -l)"
info "Assets: ${ASSET_COUNT} file(s) in dist-ota/assets/"

# ─── Step 2: Upload to MinIO ──────────────────────────────────────────────────
step "Uploading Store bundle to MinIO [${BUNDLES_PREFIX}/${VERSION}/]"
MINIO_VERSION_PATH="${MINIO_ALIAS}/${MINIO_BUCKET}/${BUNDLES_PREFIX}/${VERSION}"

"$MC" cp "$BUNDLE_FILE" "${MINIO_VERSION_PATH}/bundle.js"
info "Mirroring assets to ${MINIO_VERSION_PATH}/ ..."
"$MC" mirror dist-ota/ "${MINIO_VERSION_PATH}/" --overwrite
ok "Bundle & assets mirrored successfully"

# ─── Step 3: Write & Upload Manifest ──────────────────────────────────────────
step "Uploading Store manifest.json"
BUNDLE_URL="${BASE_URL}/${BUNDLES_PREFIX}/${VERSION}/bundle.js"
ASSETS_URL="${BASE_URL}/${BUNDLES_PREFIX}/${VERSION}/assets/"
BUNDLE_SHA256="$(sha256sum "$BUNDLE_FILE" | cut -d' ' -f1)"
BUNDLE_MD5="$(md5sum "$BUNDLE_FILE" | cut -d' ' -f1)"
BUNDLE_SIZE="$(wc -c < "$BUNDLE_FILE")"
SAFE_NOTES="${RELEASE_NOTES//\"/\'}"

MANIFEST_TMP="$(mktemp /tmp/vayyari-store-manifest-XXXXXX.json)"
cat > "$MANIFEST_TMP" <<MANIFEST_EOF
{
  "version": "${VERSION}",
  "baseVersion": "${BASE_VERSION}",
  "subversion": ${COMMIT_COUNT},
  "commitSha": "${SHORT_SHA}",
  "targetNativeVersion": 1,
  "bundlePath": "${BUNDLES_PREFIX}/${VERSION}/bundle.js",
  "bundleUrl": "${BUNDLE_URL}",
  "bundleSha256": "${BUNDLE_SHA256}",
  "bundleMd5": "${BUNDLE_MD5}",
  "bundleSize": ${BUNDLE_SIZE},
  "assetsPath": "${BUNDLES_PREFIX}/${VERSION}/assets/",
  "assetsUrl": "${ASSETS_URL}",
  "publishedAt": "${PUBLISHED_AT}",
  "releaseNotes": "${SAFE_NOTES}"
}
MANIFEST_EOF

"$MC" cp "$MANIFEST_TMP" "${MINIO_ALIAS}/${MINIO_BUCKET}/manifest.json"
rm -f "$MANIFEST_TMP"
ok "Store manifest.json uploaded successfully"

# ─── Step 4: Pruning ──────────────────────────────────────────────────────────
step "Pruning old Store bundle versions (keeping newest ${KEEP_VERSIONS})"
ALL_VERSIONS="$(
  "$MC" ls "${MINIO_ALIAS}/${MINIO_BUCKET}/${BUNDLES_PREFIX}/" 2>/dev/null \
    | awk '{print $NF}' \
    | sed 's|/$||' \
    | grep -E '^[0-9]+\.[0-9]+' \
    | sort -V
)"

VERSION_COUNT=0
[[ -n "$ALL_VERSIONS" ]] && VERSION_COUNT="$(echo "$ALL_VERSIONS" | wc -l)"

if [[ "$VERSION_COUNT" -gt "$KEEP_VERSIONS" ]]; then
  DELETE_COUNT=$(( VERSION_COUNT - KEEP_VERSIONS ))
  while IFS= read -r old_ver; do
    [[ -z "$old_ver" ]] && continue
    "$MC" rm --recursive --force "${MINIO_ALIAS}/${MINIO_BUCKET}/${BUNDLES_PREFIX}/${old_ver}/" 2>/dev/null || true
    info "  Deleted old version: ${old_ver}"
  done < <(echo "$ALL_VERSIONS" | head -n "$DELETE_COUNT")
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "🛍️  Vayyari Store OTA Push Complete"
echo "═══════════════════════════════════════════════════════════════"
echo "   Version        : ${VERSION}"
echo "   Bundle SHA256  : ${BUNDLE_SHA256}"
echo "   Bundle Size    : ${BUNDLE_SIZE} bytes"
echo "   Manifest URL   : ${BASE_URL}/manifest.json"
echo "   Published At   : ${PUBLISHED_AT}"
echo "═══════════════════════════════════════════════════════════════"
echo ""
