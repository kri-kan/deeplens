#!/usr/bin/env bash
# ==============================================================================
# Vayyari Multi-Channel Instagram Collaboration Automation Runner
#
# Supports:
#   Mode A (Queue): Runs queued jobs from DeepLens Collab Automation Queue
#   Mode B (CLI):   Explicit creator, shortcode, and multi-account collaborators
#
# Lifecycle Phases (Per Channel):
#   - suggested:             Target channel curated/queued by user
#   - invited:               Automation submitted invite on Creator account
#   - accepted:              Automation accepted invite on Collaborator account
#   - already_collaborating: Detected as existing co-author/collab (including outside human collabs)
#   - failed:                Flow failed with error detail
#
# Strategies:
#   --strategy batch (default): Invites ALL pending target collaborator accounts simultaneously
#                               in a single post editing session on Creator account,
#                               then sequentially switches to collaborator accounts to accept.
#   --strategy pairwise:        Legacy 1-to-1 ping-pong cycle (invite 1 -> accept 1 -> invite 2...)
#
# Usage:
#   # Mode A: Fetch and execute from Collab Automation Queue
#   ./tools/run_collab_automation.sh --queue
#   ./tools/run_collab_automation.sh --queue --dry-run
#
#   # Mode B: Run with explicit post and multiple target collaborator accounts
#   ./tools/run_collab_automation.sh --creator vayyari_fashions \
#       --shortcode DdYD1MOEzQt \
#       --collabs "theblouseedition,vayyari_littles,everydayvayyari" \
#       --post-id 3fa85f64-5717-4562-b3fc-2c963f66afa6
# ==============================================================================

set -o pipefail

# Ensure maestro and adb are on PATH
export PATH="$PATH:$HOME/.maestro/bin"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MAESTRO_DIR="${MAESTRO_DIR:-$WORKSPACE_ROOT/maestro}"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Defaults
CREATOR="vayyari_fashions"
COLLABS_INPUT=""
SHORTCODE=""
POST_ID=""
MODE="full"
STRATEGY="batch"
DEVICE=""
API_BASE_URL="${API_URL:-http://localhost:5000}"
IS_QUEUE_MODE=false
DRY_RUN=false
MAX_RETRIES=1
RETRY_DELAY=3
SETTLE_DELAY=4

print_banner() {
  echo -e "${CYAN}====================================================================${NC}"
  echo -e "${CYAN}   Vayyari Instagram Multi-Channel Collaboration Automation Runner   ${NC}"
  echo -e "${CYAN}   Smart Existing Collab Sync & Multi-Phase Channel Lifecycle       ${NC}"
  echo -e "${CYAN}====================================================================${NC}"
}

usage() {
  echo -e "Usage: $0 [OPTIONS]"
  echo ""
  echo "Modes:"
  echo "  --queue, --from-queue       Consume posts from Collab Automation Queue (Mode A)"
  echo "  --mode <mode>               Execution mode:"
  echo "                              'full' (default: batch invite + sequential accept)"
  echo "                              'invite_only' (Phase 1 batch invite only)"
  echo "                              'accept_only' (Phase 2 accept only)"
  echo "                              'queue' (Alias for --queue)"
  echo ""
  echo "Strategy:"
  echo "  --strategy <batch|pairwise> Execution strategy (default: 'batch')"
  echo "  --batch                     Simultaneously invite all accounts in list on Creator (default)"
  echo "  --pairwise                  Ping-pong between Creator and Collaborator accounts one-by-one"
  echo ""
  echo "CLI Arguments (Mode B):"
  echo "  --creator <handle>          Source creator account (default: 'vayyari_fashions')"
  echo "  --collabs <h1,h2,...>       Target collaborator accounts (comma-separated, max 5)"
  echo "  --collab <handle>           Single target collaborator handle (backwards-compatible)"
  echo "  --shortcode <code>          Instagram post shortcode or post URL"
  echo "  --post-id <uuid>            Post ID in database for metadata update"
  echo ""
  echo "Configuration:"
  echo "  --device <id>               Target ADB device ID (default: auto-detect emulator-5554)"
  echo "  --api-url <url>             Backend API base URL (default: http://localhost:5000)"
  echo "  --max-retries <n>           Max retries per Maestro flow attempt (default: 1)"
  echo "  --retry-delay <sec>         Delay between retries in seconds (default: 3)"
  echo "  --settle-delay <sec>        Settling delay between profile switches (default: 4)"
  echo "  --dry-run                   Simulate execution without invoking Maestro or ADB"
  echo "  -h, --help                  Show this help message"
  echo ""
  exit 0
}

# Parse command line flags
while [[ $# -gt 0 ]]; do
  case $1 in
    --queue|--from-queue)
      IS_QUEUE_MODE=true
      shift
      ;;
    --creator)
      CREATOR="$2"
      shift 2
      ;;
    --collabs)
      COLLABS_INPUT="$2"
      shift 2
      ;;
    --collab)
      COLLABS_INPUT="$2"
      shift 2
      ;;
    --shortcode)
      SHORTCODE="$2"
      shift 2
      ;;
    --post-id)
      POST_ID="$2"
      shift 2
      ;;
    --strategy)
      STRATEGY="$2"
      shift 2
      ;;
    --batch)
      STRATEGY="batch"
      shift
      ;;
    --pairwise)
      STRATEGY="pairwise"
      shift
      ;;
    --mode)
      MODE="$2"
      if [[ "$MODE" == "queue" ]]; then
        IS_QUEUE_MODE=true
      fi
      shift 2
      ;;
    --skip-accept)
      MODE="invite_only"
      shift
      ;;
    --skip-invite)
      MODE="accept_only"
      shift
      ;;
    --device)
      DEVICE="$2"
      shift 2
      ;;
    --api-url)
      API_BASE_URL="$2"
      shift 2
      ;;
    --max-retries)
      MAX_RETRIES="$2"
      shift 2
      ;;
    --retry-delay)
      RETRY_DELAY="$2"
      shift 2
      ;;
    --settle-delay)
      SETTLE_DELAY="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      usage
      ;;
  esac
done

# If dry-run is set, zero out wait delays for immediate feedback
if [[ "$DRY_RUN" == "true" ]]; then
  SETTLE_DELAY=0
  RETRY_DELAY=0
fi

# If no shortcode and no collabs passed, automatically switch to queue mode
if [[ -z "$SHORTCODE" && -z "$COLLABS_INPUT" ]]; then
  IS_QUEUE_MODE=true
fi

# Clean trailing slash from API_BASE_URL
API_BASE_URL="${API_BASE_URL%/}"

extract_shortcode() {
  local input="$1"
  if [[ "$input" =~ /p/([A-Za-z0-9_-]+) ]]; then
    echo "${BASH_REMATCH[1]}"
  elif [[ "$input" =~ /reel/([A-Za-z0-9_-]+) ]]; then
    echo "${BASH_REMATCH[1]}"
  elif [[ "$input" =~ /reels/([A-Za-z0-9_-]+) ]]; then
    echo "${BASH_REMATCH[1]}"
  else
    echo "$input" | sed -E 's/\?.*//; s/\/$//; s/.*\///'
  fi
}

check_device() {
  if [[ "$DRY_RUN" == "true" ]]; then
    DEVICE="${DEVICE:-emulator-5554}"
    echo -e "${YELLOW}[DRY RUN] Using target device: $DEVICE${NC}"
    return 0
  fi

  echo -e "${BLUE}==> Checking connected devices...${NC}"
  local connected
  connected=$(adb devices | grep -v "List of devices" | grep "device$" | awk '{print $1}')

  if [[ -z "$connected" ]]; then
    echo -e "${RED}Error: No Android device or emulator connected via adb!${NC}"
    exit 1
  fi

  if [[ -z "$DEVICE" ]]; then
    if echo "$connected" | grep -q "^emulator-5554$"; then
      DEVICE="emulator-5554"
    else
      DEVICE=$(echo "$connected" | head -n 1)
    fi
  fi

  echo -e "${GREEN}Using target device: $DEVICE${NC}"
  echo ""
}

# ==============================================================================
# Phase Lifecycle & Sync API Helpers
# ==============================================================================
api_update_channel_phase() {
  local post_id="$1"
  local channel="$2"
  local phase="$3"
  local err_msg="${4:-}"

  if [[ -z "$post_id" || -z "$channel" || -z "$phase" ]]; then
    return 0
  fi

  local payload
  payload=$(jq -n \
    --arg pid "$post_id" \
    --arg ch "$channel" \
    --arg ph "$phase" \
    --arg err "$err_msg" \
    '{postId: $pid, channel: $ch, phase: $ph, error: (if $err == "" then null else $err end)}')

  if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "${YELLOW}[DRY RUN] Update Phase API -> @${channel} is now '${phase}' for post ${post_id}${NC}"
    return 0
  fi

  local resp http_code
  resp=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE_URL}/api/v1/insta/collab-planner/update-phase" \
    -H "Content-Type: application/json" \
    -d "$payload" || true)

  http_code=$(echo "$resp" | tail -n1)
  if [[ "$http_code" =~ ^2[0-9]{2}$ ]]; then
    echo -e "${GREEN}✓ Recorded phase '${phase}' for @${channel} in database${NC}"
  else
    echo -e "${YELLOW}⚠ Warning: Failed to update phase for @${channel} (HTTP ${http_code})${NC}"
  fi
}

api_sync_collaborators() {
  local post_id="$1"
  local collabs_json="$2"
  local detected_from="${3:-instagram_inspect}"

  if [[ -z "$post_id" || -z "$collabs_json" || "$collabs_json" == "[]" ]]; then
    return 0
  fi

  local payload
  payload=$(jq -n \
    --arg pid "$post_id" \
    --argjson collabs "$collabs_json" \
    --arg from "$detected_from" \
    '{postId: $pid, collaborators: $collabs, detectedFrom: $from}')

  if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "${YELLOW}[DRY RUN] Sync Collaborators API -> Found existing collabs for post ${post_id}:${NC}"
    echo "$payload" | jq .
    return 0
  fi

  local resp http_code body
  resp=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE_URL}/api/v1/insta/collab-planner/sync-collaborators" \
    -H "Content-Type: application/json" \
    -d "$payload" || true)

  http_code=$(echo "$resp" | tail -n1)
  body=$(echo "$resp" | sed '$d')

  if [[ "$http_code" =~ ^2[0-9]{2}$ ]]; then
    local new_count
    new_count=$(echo "$body" | jq -r '.newlyAddedCount // 0')
    if [[ "$new_count" -gt 0 ]]; then
      echo -e "${GREEN}✓ Synced ${new_count} newly detected collaborator(s) to database (including manual outside collabs)!${NC}"
    fi
  fi
}

# ==============================================================================
# Screen & Post Introspection for Existing Collaborators
# ==============================================================================
inspect_existing_collaborators() {
  local post_id="$1"
  local shortcode="$2"
  local raw_collabs_json="${3:-[]}"
  local creator="${4:-}"

  echo -e "${BLUE}==> [Smart Collab Detection] Inspecting existing collaborators for post ${shortcode}...${NC}"

  local -a detected_handles=()

  # 1. Check known collaborators already stored in database
  if [[ -n "$raw_collabs_json" && "$raw_collabs_json" != "[]" && "$raw_collabs_json" != "null" ]]; then
    while IFS= read -r h; do
      if [[ -n "$h" && "$h" != "null" ]]; then
        detected_handles+=("$h")
      fi
    done < <(echo "$raw_collabs_json" | jq -r '.[].username // .[].targetCollabAccount // .[] // empty' 2>/dev/null || true)
  fi

  # 2. If ADB device is connected and not dry run, inspect UI dump for on-screen collaborator tags ONLY if Instagram is focused
  if [[ "$DRY_RUN" != "true" && -n "$DEVICE" ]]; then
    if [[ -n "$shortcode" ]]; then
      adb -s "$DEVICE" shell am start -a android.intent.action.VIEW -d "https://www.instagram.com/p/${shortcode}/" -p com.instagram.android >/dev/null 2>&1 || true
      sleep 3
    fi
    local focused_pkg
    focused_pkg=$(adb -s "$DEVICE" shell dumpsys window 2>/dev/null | grep -E "mCurrentFocus" | grep -oE "com\.instagram\.android" || true)
    if [[ -n "$focused_pkg" ]]; then
      local ui_dump
      ui_dump=$(adb -s "$DEVICE" exec-out uiautomator dump /dev/tty 2>/dev/null || true)
      if [[ -n "$ui_dump" ]]; then
        # Scan UI hierarchy text for "and @..." or collaborator handles
        local found_on_screen
        found_on_screen=$(echo "$ui_dump" | grep -oE '(vayyari_[a-z0-9_]+|theblouseedition|dressbyvayyari|everydayvayyari|editionsbyvayyari|eclipsevayyari|vayyaristudio)' | sort -u || true)
        while IFS= read -r handle; do
          if [[ -n "$handle" ]]; then
            detected_handles+=("$handle")
          fi
        done <<< "$found_on_screen"
      fi
    fi
  fi

  # Deduplicate handles and exclude creator account
  local -a unique_handles=()
  for h in "${detected_handles[@]}"; do
    h="${h#@}"
    h="${h// /}"
    [[ -z "$h" ]] && continue
    if [[ -n "$creator" && "${h,,}" == "${creator,,}" ]]; then
      continue
    fi
    local exists=false
    for u in "${unique_handles[@]}"; do
      if [[ "${u,,}" == "${h,,}" ]]; then
        exists=true
        break
      fi
    done
    if [[ "$exists" == "false" ]]; then
      unique_handles+=("$h")
    fi
  done

  # If any detected, sync them to database immediately
  if [[ ${#unique_handles[@]} -gt 0 && -n "$post_id" ]]; then
    echo -e "${CYAN}Found existing collaborators on post: ${unique_handles[*]}${NC}"
    local collabs_payload
    collabs_payload=$(printf '%s\n' "${unique_handles[@]}" | jq -R '{username: .}' | jq -s .)
    api_sync_collaborators "$post_id" "$collabs_payload" "instagram_inspect"
  else
    echo -e "${BLUE}No pre-existing collaborators detected on post.${NC}"
  fi

  printf '%s\n' "${unique_handles[@]}"
}

# ==============================================================================
# Single Flow Execution (Used for Phase 2 Accept or Pairwise fallback)
# ==============================================================================
run_maestro_flow() {
  local flow_yaml="$1"
  local creator="$2"
  local collab="$3"
  local shortcode="$4"
  local flow_name="$5"

  local attempt=1
  local max_attempts=$(( MAX_RETRIES + 1 ))
  local success=false

  while [[ $attempt -le $max_attempts ]]; do
    echo -e "${BLUE}==> [${flow_name}] @${creator} -> @${collab} (Attempt ${attempt}/${max_attempts})...${NC}"

    if [[ "$DRY_RUN" == "true" ]]; then
      echo -e "${YELLOW}[DRY RUN] Would run: maestro --device \"$DEVICE\" test -e CREATOR_ACCOUNT=\"$creator\" -e COLLAB_HANDLE=\"$collab\" -e SHORTCODE=\"$shortcode\" \"$flow_yaml\"${NC}"
      success=true
      break
    fi

    set +e
    maestro --device "$DEVICE" test \
      -e CREATOR_ACCOUNT="$creator" \
      -e COLLAB_HANDLE="$collab" \
      -e SHORTCODE="$shortcode" \
      "$flow_yaml"
    local exit_code=$?
    set -e

    if [[ $exit_code -eq 0 ]]; then
      echo -e "${GREEN}✓ ${flow_name} succeeded for @${collab}!${NC}"
      success=true
      break
    else
      echo -e "${RED}✗ ${flow_name} failed for @${collab} (exit code: ${exit_code}).${NC}"
      if [[ $attempt -lt $max_attempts ]]; then
        echo -e "${YELLOW}Retrying in ${RETRY_DELAY} seconds...${NC}"
        sleep "$RETRY_DELAY"
      fi
    fi
    attempt=$(( attempt + 1 ))
  done

  if [[ "$success" != "true" ]]; then
    return 1
  fi
  return 0
}

# ==============================================================================
# Phase 1: Simultaneous Multi-Account Batch Invite
# Invites up to 5 collaborator handles in ONE post editing session on Creator account
# ==============================================================================
run_maestro_batch_invite() {
  local flow_yaml="$1"
  local creator="$2"
  local shortcode="$3"
  shift 3
  local -a targets=("$@")

  local count=${#targets[@]}
  if [[ $count -gt 5 ]]; then
    echo -e "${YELLOW}Notice: Capping collaborator invite list to 5 accounts (Instagram limit).${NC}"
    count=5
  fi

  # Build Maestro -e arguments for multi-account tagging
  local -a maestro_args=()
  maestro_args+=(-e "CREATOR_ACCOUNT=$creator")
  maestro_args+=(-e "SHORTCODE=$shortcode")
  maestro_args+=(-e "COLLAB_COUNT=$count")

  local idx=1
  for acc in "${targets[@]:0:$count}"; do
    maestro_args+=(-e "COLLAB_${idx}=$acc")
    idx=$((idx + 1))
  done
  # Legacy fallback for COLLAB_HANDLE
  maestro_args+=(-e "COLLAB_HANDLE=${targets[0]}")

  local attempt=1
  local max_attempts=$(( MAX_RETRIES + 1 ))
  local success=false

  while [[ $attempt -le $max_attempts ]]; do
    echo -e "${BLUE}==> [Phase 1: Simultaneous Batch Invite] @${creator} -> [${targets[*]:0:$count}] (Attempt ${attempt}/${max_attempts})...${NC}"

    if [[ "$DRY_RUN" == "true" ]]; then
      echo -e "${YELLOW}[DRY RUN] Would run: maestro --device \"$DEVICE\" test ${maestro_args[*]} \"$flow_yaml\"${NC}"
      success=true
      break
    fi

    set +e
    maestro --device "$DEVICE" test "${maestro_args[@]}" "$flow_yaml"
    local exit_code=$?
    set -e

    if [[ $exit_code -eq 0 ]]; then
      echo -e "${GREEN}✓ Simultaneous batch invite succeeded for: ${targets[*]:0:$count}!${NC}"
      success=true
      break
    else
      echo -e "${RED}✗ Simultaneous batch invite failed (exit code: ${exit_code}).${NC}"
      if [[ $attempt -lt $max_attempts ]]; then
        echo -e "${YELLOW}Retrying batch invite in ${RETRY_DELAY} seconds...${NC}"
        sleep "$RETRY_DELAY"
      fi
    fi
    attempt=$(( attempt + 1 ))
  done

  if [[ "$success" != "true" ]]; then
    return 1
  fi
  return 0
}

# ==============================================================================
# Unified Pipeline for a Single Post and its List of Collaborators
# ==============================================================================
execute_post_collab_pipeline() {
  local creator="$1"
  local shortcode="$2"
  local post_id="$3"
  local mode="$4"
  local raw_collabs_json="$5"
  shift 5
  local -a targets=("$@")

  echo -e "${MAGENTA}====================================================================${NC}"
  echo -e "${MAGENTA} Collab Pipeline for Post: ${shortcode} (ID: ${post_id:-N/A})${NC}"
  echo -e "${MAGENTA} Creator: @${creator} | Curated Targets (${#targets[@]}): ${targets[*]}${NC}"
  echo -e "${MAGENTA} Strategy: ${STRATEGY^^} | Mode: ${mode}${NC}"
  echo -e "${MAGENTA}====================================================================${NC}"

  # Step 1: Detect existing collaborators on this post (including manual human collabs)
  local existing_detected=()
  while IFS= read -r ex_handle; do
    if [[ -n "$ex_handle" ]]; then
      existing_detected+=("$ex_handle")
    fi
  done < <(inspect_existing_collaborators "$post_id" "$shortcode" "$raw_collabs_json" "$creator")

  # Step 2: Classify target accounts into already_active vs pending_invites
  local -a already_active=()
  local -a pending_invites=()

  for target in "${targets[@]}"; do
    local is_active=false
    for ex in "${existing_detected[@]}"; do
      if [[ "${ex,,}" == "${target,,}" ]]; then
        is_active=true
        break
      fi
    done

    if [[ "$is_active" == "true" ]]; then
      already_active+=("$target")
      echo -e "${CYAN}ℹ Target account @${target} is ALREADY collaborating on post ${shortcode}. Skipping invite/accept.${NC}"
      api_update_channel_phase "$post_id" "$target" "already_collaborating"
    else
      pending_invites+=("$target")
    fi
  done

  local -a successful_collabs=("${already_active[@]}")

  if [[ ${#pending_invites[@]} -eq 0 ]]; then
    echo -e "${GREEN}✓ All intended collaboration accounts are already established for post ${shortcode}!${NC}"
    return 0
  fi

  echo -e "${BLUE}Pending accounts requiring automation (${#pending_invites[@]}): ${pending_invites[*]}${NC}"

  # Step 3: Phase 1 (Simultaneous Batch Invite on Creator Account)
  local invite_succeeded=false

  if [[ "$mode" == "full" || "$mode" == "invite_only" ]]; then
    if [[ "$STRATEGY" == "batch" ]]; then
      if run_maestro_batch_invite "$MAESTRO_DIR/instagram_collab_invite.yaml" "$creator" "$shortcode" "${pending_invites[@]}"; then
        invite_succeeded=true
        # Update phase for each successfully invited channel
        for inv_acc in "${pending_invites[@]}"; do
          api_update_channel_phase "$post_id" "$inv_acc" "invited"
        done
      else
        echo -e "${RED}Batch invite failed for post ${shortcode}.${NC}"
        for inv_acc in "${pending_invites[@]}"; do
          api_update_channel_phase "$post_id" "$inv_acc" "failed" "Batch invite flow failed"
        done
      fi
    else
      # Pairwise invite fallback
      invite_succeeded=true
      for inv_acc in "${pending_invites[@]}"; do
        if run_maestro_flow "$MAESTRO_DIR/instagram_collab_invite.yaml" "$creator" "$inv_acc" "$shortcode" "Phase 1 (Invite)"; then
          api_update_channel_phase "$post_id" "$inv_acc" "invited"
        else
          api_update_channel_phase "$post_id" "$inv_acc" "failed" "Pairwise invite flow failed"
        fi
      done
    fi

    if [[ "$mode" == "full" && "$invite_succeeded" == "true" ]]; then
      echo -e "${YELLOW}Settling for ${SETTLE_DELAY}s before starting collaborator acceptance cycle...${NC}"
      sleep "$SETTLE_DELAY"
    fi
  fi

  # Step 4: Phase 2 (Sequential Streamlined Acceptance)
  if [[ ("$mode" == "full" && "$invite_succeeded" == "true") || "$mode" == "accept_only" ]]; then
    local c_idx=1
    local total_c=${#pending_invites[@]}
    for collab in "${pending_invites[@]}"; do
      echo -e "${CYAN}--------------------------------------------------------------------${NC}"
      echo -e "${CYAN} [Phase 2: Accept ($c_idx/$total_c)] Switching account to @${collab}...${NC}"
      echo -e "${CYAN}--------------------------------------------------------------------${NC}"

      if run_maestro_flow "$MAESTRO_DIR/instagram_collab_accept.yaml" "$creator" "$collab" "$shortcode" "Phase 2 (Accept)"; then
        successful_collabs+=("$collab")
        api_update_channel_phase "$post_id" "$collab" "accepted"
      else
        echo -e "${RED}Acceptance flow failed for @${collab} on post ${shortcode}.${NC}"
        api_update_channel_phase "$post_id" "$collab" "failed" "Collaborator review or accept timeout"
      fi

      c_idx=$((c_idx + 1))
      if [[ $c_idx -le $total_c ]]; then
        echo -e "${YELLOW}Settling for ${SETTLE_DELAY}s before next collaborator account switch...${NC}"
        sleep "$SETTLE_DELAY"
      fi
    done
  fi

  echo -e "${GREEN}====================================================================${NC}"
  echo -e "${GREEN}   Pipeline Complete for Post ${shortcode}! Established Collabs: ${successful_collabs[*]}   ${NC}"
  echo -e "${GREEN}====================================================================${NC}"
  echo ""
}

# ==============================================================================
# Mode A: Process Queue
# ==============================================================================
run_queue_mode() {
  echo -e "${MAGENTA}Mode: Collab Automation Queue Processing${NC}"
  echo -e "${BLUE}API Endpoint : ${API_BASE_URL}/api/v1/insta/collab-planner/queue${NC}"
  echo -e "${BLUE}Strategy     : ${STRATEGY^^} (Simultaneous batch invite + smart existing sync)${NC}"
  echo ""

  check_device

  echo -e "${BLUE}==> Fetching pending posts from Collab Automation Queue...${NC}"
  local queue_resp http_code body
  queue_resp=$(curl -s -w "\n%{http_code}" "${API_BASE_URL}/api/v1/insta/collab-planner/queue" || true)
  http_code=$(echo "$queue_resp" | tail -n1)
  body=$(echo "$queue_resp" | sed '$d')

  if [[ ! "$http_code" =~ ^2[0-9]{2}$ ]]; then
    echo -e "${YELLOW}Notice: Collab queue endpoint returned HTTP ${http_code}.${NC}"
    if [[ "$http_code" == "404" ]]; then
      echo -e "${YELLOW}Backend queue endpoint is not yet active or currently empty.${NC}"
    else
      echo -e "${RED}Error fetching queue: ${body}${NC}"
    fi
    exit 0
  fi

  local posts_json queue_len
  posts_json=$(echo "$body" | jq 'if type == "array" then . elif .data then .data elif .posts then .posts elif .queue then .queue else [] end')
  queue_len=$(echo "$posts_json" | jq 'length')

  if [[ "$queue_len" -eq 0 ]]; then
    echo -e "${GREEN}Collab automation queue is empty (0 posts pending). Nothing to process.${NC}"
    exit 0
  fi

  echo -e "${GREEN}Found ${queue_len} queued post(s) for collab automation.${NC}"
  echo ""

  local i=0
  while [[ $i -lt $queue_len ]]; do
    local post
    post=$(echo "$posts_json" | jq -c ".[$i]")

    local p_id p_shortcode p_url p_creator p_raw_collabs
    p_id=$(echo "$post" | jq -r '.postId // .id // .post_id // ""')
    p_shortcode=$(echo "$post" | jq -r '.shortcode // .shortCode // .short_code // ""')
    p_url=$(echo "$post" | jq -r '.videoUrl // .video_url // .url // .permalink // ""')
    p_creator=$(echo "$post" | jq -r '.creatorAccount // .creator_account // .ownerUsername // .username // "vayyari_fashions"')
    p_raw_collabs=$(echo "$post" | jq -c '.collaborators // []')

    if [[ -z "$p_shortcode" && -n "$p_url" ]]; then
      p_shortcode=$(extract_shortcode "$p_url")
    fi

    if [[ -z "$p_shortcode" ]]; then
      echo -e "${YELLOW}Skipping post #${i} (ID: ${p_id}): Unable to determine shortcode from URL: ${p_url}${NC}"
      i=$(( i + 1 ))
      continue
    fi

    # Read target accounts
    local target_accounts=()
    while IFS= read -r acc; do
      acc="${acc#@}"
      acc="${acc// /}"
      if [[ -n "$acc" && "$acc" != "null" ]]; then
        target_accounts+=("$acc")
      fi
    done < <(echo "$post" | jq -r '(.targetCollabAccounts[]? // .target_collab_accounts[]? // empty) | if type == "object" then .username else . end')

    if [[ ${#target_accounts[@]} -eq 0 ]]; then
      echo -e "${YELLOW}Post ${p_shortcode} (ID: ${p_id}) has no target collaboration accounts queued.${NC}"
      i=$(( i + 1 ))
      continue
    fi

    execute_post_collab_pipeline "$p_creator" "$p_shortcode" "$p_id" "$MODE" "$p_raw_collabs" "${target_accounts[@]}"

    i=$(( i + 1 ))
  done

  echo -e "${GREEN}====================================================================${NC}"
  echo -e "${GREEN}   Collab Automation Queue Processing Complete!                    ${NC}"
  echo -e "${GREEN}====================================================================${NC}"
}

# ==============================================================================
# Mode B: Run from CLI Arguments
# ==============================================================================
run_cli_mode() {
  local shortcode
  shortcode=$(extract_shortcode "$SHORTCODE")

  if [[ -z "$shortcode" ]]; then
    echo -e "${RED}Error: Post shortcode or URL is required! Use --shortcode <code_or_url>${NC}"
    usage
  fi

  if [[ -z "$COLLABS_INPUT" ]]; then
    echo -e "${RED}Error: At least one collaborator handle is required! Use --collabs <handles>${NC}"
    usage
  fi

  # Split comma-separated handles into array
  IFS=',' read -r -a raw_collabs <<< "$COLLABS_INPUT"
  local clean_collabs=()

  for raw in "${raw_collabs[@]}"; do
    local handle
    handle=$(echo "$raw" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | sed 's/^@//')
    if [[ -n "$handle" ]]; then
      clean_collabs+=("$handle")
    fi
  done

  if [[ ${#clean_collabs[@]} -eq 0 ]]; then
    echo -e "${RED}Error: No valid collaborator accounts provided.${NC}"
    exit 1
  fi

  if [[ ${#clean_collabs[@]} -gt 5 ]]; then
    echo -e "${YELLOW}Notice: Instagram allows a maximum of 5 collaborators. Truncating to first 5.${NC}"
    clean_collabs=("${clean_collabs[@]:0:5}")
  fi

  echo -e "${MAGENTA}Mode            : CLI Execution${NC}"
  echo -e "${BLUE}Creator Account : @${CREATOR}${NC}"
  echo -e "${BLUE}Target Accounts : ${clean_collabs[*]} (${#clean_collabs[@]} total)${NC}"
  echo -e "${BLUE}Post Shortcode  : ${shortcode}${NC}"
  echo -e "${BLUE}Strategy        : ${STRATEGY^^}${NC}"
  echo -e "${BLUE}Execution Mode  : ${MODE}${NC}"
  echo ""

  check_device

  execute_post_collab_pipeline "$CREATOR" "$shortcode" "$POST_ID" "$MODE" "[]" "${clean_collabs[@]}"
}

# ==============================================================================
# Main Dispatcher
# ==============================================================================
print_banner

if [[ "$IS_QUEUE_MODE" == "true" ]]; then
  run_queue_mode
else
  run_cli_mode
fi
