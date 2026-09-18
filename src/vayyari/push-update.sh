#!/usr/bin/env bash
# push-update.sh — Export & push Vayyari OTA JS bundle to MinIO
# Part of ADO User Story #336: Vayyari Standalone APK + OTA Updates
#
# Usage:
#   ./push-update.sh [--notes "Release notes text"]
#
# ┌──────────────────────────────────────────────────────────────────┐
# │  This script pushes a JS-only OTA bundle. It does NOT rebuild    │
# │  the native APK. Run ./build-apk.sh FIRST when you have changed: │
# │    • Any native module dependency (package.json)                 │
# │    • android/ directory files (Gradle, manifests)               │
# │    • app.json plugins (expo-media-library, splash, etc.)         │
# │    • expo SDK version bump                                       │
# │  Use this script (push-update.sh) alone when only TS/JS changed. │
# └──────────────────────────────────────────────────────────────────┘
#
# What this does:
#   1. Generates a version tag: v$(date +%Y%m%d%H%M)  e.g. v202608280130
#   2. Runs:  npx expo export --platform android
#   3. Mirrors the full dist/ output to MinIO:
#        local/admin-updates/bundles/$VERSION/
#   4. Writes and uploads manifest.json to:
#        local/admin-updates/manifest.json
#   5. Prunes old version folders — keeps newest 5, deletes the rest.
#   6. Prints a summary.
#
# Requirements:
#   - MinIO Client (mc) configured with alias "local" → http://localhost:9000
#     Bucket "admin-updates" must exist and be publicly readable.
#     Quick setup:
#       mc alias set local http://localhost:9000 <ACCESS_KEY> <SECRET_KEY>
#       mc mb local/admin-updates
#       mc anonymous set download local/admin-updates
#   - npx available in PATH (Node.js installed)
#
# MinIO layout after this script:
#   admin-updates/
#   ├── manifest.json               ← latest version pointer (ops reference)
#   └── bundles/
#       ├── v202608280130/          ← versioned snapshot (newest kept 3)
#       │   ├── bundle.js           ← the Hermes .hbc bundle renamed for clarity
#       │   └── assets/             ← all hashed asset files from dist/assets/
#       └── v202608270900/
#           └── ...
#
# NOTE: The app does NOT poll manifest.json at runtime — expo-updates is
#       disabled in app.json. Bundles in MinIO are stored for archival and
#       future OTA implementation. Current updates are delivered via APK
#       re-install from the internal publish share.

set -euo pipefail

# ─── Constants ─────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MINIO_ALIAS="local"
MINIO_BUCKET="admin-updates"
BUNDLES_PREFIX="bundles"
BASE_URL="http://krikanserver.taild227d9.ts.net/admin-updates"
KEEP_VERSIONS=5

# ─── Argument parsing ──────────────────────────────────────────────────────────
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
      grep "^#" "$0" | head -40 | sed 's/^# \?//'
      exit 0
      ;;
    *)
      echo "❌  Unknown argument: $1" >&2
      echo "Usage: $0 [--notes \"Release notes\"]" >&2
      exit 1
      ;;
  esac
done

# ─── Version tag ──────────────────────────────────────────────────────────────
BASE_VERSION="1.0.0"
if [[ -f "$SCRIPT_DIR/app.json" ]]; then
  EXTRACTED_VER=$(grep -o '"version": *"[^"]*"' "$SCRIPT_DIR/app.json" | head -1 | cut -d'"' -f4 || true)
  if [[ -n "$EXTRACTED_VER" ]]; then
    BASE_VERSION="$EXTRACTED_VER"
  fi
fi

COMMIT_COUNT=$(git rev-list --count HEAD -- "$SCRIPT_DIR" 2>/dev/null || echo "1")
SHORT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "dev")
DIRTY_FLAG=""
if [[ -n "$(git status --porcelain "$SCRIPT_DIR" 2>/dev/null)" ]]; then
  DIRTY_FLAG="-dirty"
fi

VERSION="${BASE_VERSION}.${COMMIT_COUNT}${DIRTY_FLAG}"
PUBLISHED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# ─── Helpers ──────────────────────────────────────────────────────────────────
step() { echo ""; echo "🔷  $*"; }
ok()   { echo "   ✅  $*"; }
info() { echo "   ℹ️   $*"; }
warn() { echo "   ⚠️   $*" >&2; }
die()  { echo ""; echo "❌  $*" >&2; exit 1; }

# ─── Locate MinIO Client (mc) ─────────────────────────────────────────────────
# On Ubuntu, /usr/bin/mc is Midnight Commander — NOT MinIO Client.
# We verify by checking --version output for "minio" or "RELEASE".
step "Preflight: locating MinIO Client (mc)"

find_mc() {
  local candidates=(
    "$HOME/bin/mc"
    "$HOME/.local/bin/mc"
    "/usr/local/bin/mc"
    "/opt/minio/mc"
    "/opt/bin/mc"
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
  die "MinIO Client (mc) not found.
  Install it:
    mkdir -p ~/bin
    curl -sSL https://dl.min.io/client/mc/release/linux-amd64/mc -o ~/bin/mc
    chmod +x ~/bin/mc
  Configure the 'local' alias:
    ~/bin/mc alias set local http://localhost:9000 <ACCESS_KEY> <SECRET_KEY>
  Create and open the bucket:
    ~/bin/mc mb local/admin-updates
    ~/bin/mc anonymous set download local/admin-updates"
fi
ok "mc found: $MC ($("$MC" --version 2>&1 | head -1))"

# ─── Preflight: MinIO connectivity ────────────────────────────────────────────
step "Preflight: verifying MinIO connectivity"

if ! "$MC" ls "${MINIO_ALIAS}/" &>/dev/null; then
  die "Cannot reach MinIO alias '${MINIO_ALIAS}'. Check that MinIO is running and the alias is configured."
fi

if ! "$MC" ls "${MINIO_ALIAS}/${MINIO_BUCKET}" &>/dev/null; then
  die "Bucket '${MINIO_BUCKET}' not found on alias '${MINIO_ALIAS}'.
  Create it:  $MC mb ${MINIO_ALIAS}/${MINIO_BUCKET}
  Open it:    $MC anonymous set download ${MINIO_ALIAS}/${MINIO_BUCKET}"
fi
ok "MinIO reachable, bucket '${MINIO_BUCKET}' accessible"

# ─── Step 1: Expo export ──────────────────────────────────────────────────────
step "Running expo export --platform android  [${VERSION}]"

cd "$SCRIPT_DIR"

if [[ -d "dist" ]]; then
  info "Removing stale dist/ from previous export..."
  rm -rf dist
fi

npx expo export --platform android
ok "Expo export complete"

# Verify dist/ was produced
if [[ ! -d "dist" ]]; then
  die "dist/ directory not found after expo export. Export may have failed."
fi

# ─── Step 2: Locate primary bundle file ───────────────────────────────────────
step "Locating bundle file in dist/"

# Expo ~54 + expo-router emits Hermes bytecode (.hbc) at:
#   dist/_expo/static/js/android/*.hbc
# Fallbacks for older versions or non-Hermes builds.
BUNDLE_FILE=""
BUNDLE_FILE="${BUNDLE_FILE:-$(find dist/_expo/static/js/android -name "*.hbc" -type f 2>/dev/null | sort | tail -1)}"
BUNDLE_FILE="${BUNDLE_FILE:-$(find dist -name "*.hbc" -type f 2>/dev/null | sort | tail -1)}"
BUNDLE_FILE="${BUNDLE_FILE:-$(find dist -name "index.bundle" -type f 2>/dev/null | head -1)}"
BUNDLE_FILE="${BUNDLE_FILE:-$(find dist -name "*.bundle" -type f 2>/dev/null | sort | tail -1)}"

if [[ -z "$BUNDLE_FILE" ]]; then
  echo "   🗂️  dist/ contents (for debugging):"
  find dist -type f | sort | sed 's/^/      /'
  die "No bundle file found in dist/. Inspect expo export output above."
fi

ok "Bundle: ${BUNDLE_FILE}  ($(du -sh "$BUNDLE_FILE" | cut -f1))"

ASSETS_DIR="dist/assets"
ASSET_COUNT=0
[[ -d "$ASSETS_DIR" ]] && ASSET_COUNT="$(find "$ASSETS_DIR" -type f | wc -l)"
info "Assets: ${ASSET_COUNT} file(s) in dist/assets/"

# ─── Step 3: Upload bundle + assets to MinIO ──────────────────────────────────
step "Uploading bundle to MinIO  [bundles/${VERSION}/]"

MINIO_VERSION_PATH="${MINIO_ALIAS}/${MINIO_BUCKET}/${BUNDLES_PREFIX}/${VERSION}"

# Upload the primary bundle as bundle.js (normalised name for consumers)
"$MC" cp "$BUNDLE_FILE" "${MINIO_VERSION_PATH}/bundle.js"
ok "bundle.js uploaded → ${MINIO_VERSION_PATH}/bundle.js"

# Mirror entire dist/ output (assets + any metadata files) to the version folder.
# mc mirror syncs dist/ → bundles/$VERSION/, skipping the bundle itself (already
# uploaded above as bundle.js). Additional files from expo export are preserved.
info "Mirroring dist/ → ${MINIO_VERSION_PATH}/ ..."
"$MC" mirror dist/ "${MINIO_VERSION_PATH}/" --overwrite
ok "dist/ mirrored → ${MINIO_VERSION_PATH}/ (${ASSET_COUNT} asset files)"

# ─── Step 4: Update manifest.json ─────────────────────────────────────────────
step "Uploading manifest.json"

BUNDLE_URL="${BASE_URL}/${BUNDLES_PREFIX}/${VERSION}/bundle.js"
ASSETS_URL="${BASE_URL}/${BUNDLES_PREFIX}/${VERSION}/assets/"
BUNDLE_SHA256="$(sha256sum "$BUNDLE_FILE" | cut -d' ' -f1)"
BUNDLE_MD5="$(md5sum "$BUNDLE_FILE" | cut -d' ' -f1)"
BUNDLE_SIZE="$(wc -c < "$BUNDLE_FILE")"

# Escape double quotes in release notes (basic safeguard)
SAFE_NOTES="${RELEASE_NOTES//\"/\'}"

MANIFEST_TMP="$(mktemp /tmp/vayyari-manifest-XXXXXX.json)"
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
ok "manifest.json → ${MINIO_ALIAS}/${MINIO_BUCKET}/manifest.json"

# ─── Step 5: Prune old versions ────────────────────────────────────────────────
step "Pruning old bundle versions (keeping newest ${KEEP_VERSIONS})"

# List version directories matching our naming convention, sort ascending (oldest first)
ALL_VERSIONS="$(
  "$MC" ls "${MINIO_ALIAS}/${MINIO_BUCKET}/${BUNDLES_PREFIX}/" 2>/dev/null \
    | awk '{print $NF}' \
    | sed 's|/$||' \
    | grep -E '^[0-9]+\.[0-9]+' \
    | sort -V
)"

VERSION_COUNT=0
[[ -n "$ALL_VERSIONS" ]] && VERSION_COUNT="$(echo "$ALL_VERSIONS" | wc -l)"
info "Total versions in MinIO: ${VERSION_COUNT}"

PRUNED_LIST=""
if [[ "$VERSION_COUNT" -gt "$KEEP_VERSIONS" ]]; then
  DELETE_COUNT=$(( VERSION_COUNT - KEEP_VERSIONS ))
  echo "   🗑️  Deleting ${DELETE_COUNT} oldest version(s):"
  while IFS= read -r old_ver; do
    [[ -z "$old_ver" ]] && continue
    echo "      → ${BUNDLES_PREFIX}/${old_ver}/"
    if "$MC" rm --recursive --force \
         "${MINIO_ALIAS}/${MINIO_BUCKET}/${BUNDLES_PREFIX}/${old_ver}/" \
         2>/dev/null; then
      PRUNED_LIST="${PRUNED_LIST} ${old_ver}"
    else
      warn "Could not delete ${old_ver} — skipping"
    fi
  done < <(echo "$ALL_VERSIONS" | head -n "$DELETE_COUNT")
  ok "Pruning complete"
else
  ok "No pruning needed (${VERSION_COUNT} of max ${KEEP_VERSIONS} versions stored)"
fi

# ─── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "🚀  Vayyari OTA Push Complete"
echo "═══════════════════════════════════════════════════════════════"
echo "   Version        : ${VERSION}"
echo "   Bundle URL     : ${BUNDLE_URL}"
echo "   Assets URL     : ${ASSETS_URL}"
echo "   Manifest URL   : ${BASE_URL}/manifest.json"
echo "   Published At   : ${PUBLISHED_AT}"
echo "   Release Notes  : ${RELEASE_NOTES}"
[[ -n "$PRUNED_LIST" ]] && echo "   Pruned         :${PRUNED_LIST}"
echo "═══════════════════════════════════════════════════════════════"
echo ""
