#!/usr/bin/env bash
# ==============================================================================
# Vayyari Multi-Channel Instagram Collaboration Automation Runner
#
# Supports:
#   Mode A (Queue): Runs queued jobs from DeepLens Collab Automation Queue
#   Mode B (CLI):   Explicit creator, shortcode, and multi-account collaborators
#
# Strategies:
#   --strategy batch (default): Invites ALL target collaborator accounts simultaneously
#                               in a single post editing session on Creator account,
#                               then sequentially switches to collaborator accounts to accept.
#   --strategy pairwise:        Legacy 1-to-1 ping-pong cycle (invite 1 -> accept 1 -> invite 2...)
#
# Usage:
#   # Mode A: Fetch and execute from Collab Automation Queue (Simultaneous Batch)
#   ./tools/run_collab_automation.sh --queue
#   ./tools/run_collab_automation.sh --queue --dry-run
#
#   # Mode B: Run with explicit post and multiple target collaborator accounts
#   ./tools/run_collab_automation.sh --creator vayyari_fashions \
#       --shortcode DdYD1MOEzQt \
#       --collabs "theblouseedition,vayyari_littles,everydayvayyari" \
#       --post-id 3fa85f64-5717-4562-b3fc-2c963f66afa6
#
#   # Single account legacy syntax
#   ./tools/run_collab_automation.sh --collab dressbyvayyari --shortcode DAxyz123
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
  echo -e "${CYAN}   Simultaneous Batch Invite & Streamlined Multi-Channel Accept     ${NC}"
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
# Pairwise Legacy Runner (Invite 1 -> Accept 1 -> Invite 2...)
# ==============================================================================
execute_collab_pair() {
  local creator="$1"
  local collab="$2"
  local shortcode="$3"
  local mode="$4"

  echo -e "${CYAN}--------------------------------------------------------------------${NC}"
  echo -e "${CYAN} Executing Collab Pair: Creator @${creator} <--> Collab @${collab}${NC}"
  echo -e "${CYAN} Post Shortcode: ${shortcode}${NC}"
  echo -e "${CYAN}--------------------------------------------------------------------${NC}"

  # Phase 1: Creator Invites Collaborator
  if [[ "$mode" == "full" || "$mode" == "invite_only" ]]; then
    if ! run_maestro_flow "$MAESTRO_DIR/instagram_collab_invite.yaml" "$creator" "$collab" "$shortcode" "Phase 1 (Invite)"; then
      echo -e "${RED}Phase 1 failed for @${collab}. Skipping acceptance phase.${NC}"
      return 1
    fi

    if [[ "$mode" == "full" ]]; then
      echo -e "${YELLOW}Settling for ${SETTLE_DELAY}s before account profile switch...${NC}"
      sleep "$SETTLE_DELAY"
    fi
  fi

  # Phase 2: Switch Profile & Accept Collaboration
  if [[ "$mode" == "full" || "$mode" == "accept_only" ]]; then
    if ! run_maestro_flow "$MAESTRO_DIR/instagram_collab_accept.yaml" "$creator" "$collab" "$shortcode" "Phase 2 (Accept)"; then
      echo -e "${RED}Phase 2 failed for @${collab}.${NC}"
      return 1
    fi
  fi

  echo -e "${GREEN}✓ Collaboration pair established for @${collab}!${NC}"
  return 0
}

post_completion_metadata() {
  local post_id="$1"
  local collabs_json="$2"

  if [[ -z "$post_id" ]]; then
    return 0
  fi

  echo -e "${CYAN}==> Updating post metadata in database via DeepLens SearchApi...${NC}"
  local payload
  payload=$(jq -n --arg pid "$post_id" --argjson collabs "$collabs_json" '{postId: $pid, collaborators: $collabs}')

  if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "${YELLOW}[DRY RUN] Would POST to ${API_BASE_URL}/api/v1/insta/collab-planner/complete:${NC}"
    echo "$payload" | jq .
    return 0
  fi

  local resp http_code body
  resp=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE_URL}/api/v1/insta/collab-planner/complete" \
    -H "Content-Type: application/json" \
    -d "$payload" || true)

  http_code=$(echo "$resp" | tail -n1)
  body=$(echo "$resp" | sed '$d')

  if [[ "$http_code" =~ ^2[0-9]{2}$ ]]; then
    echo -e "${GREEN}✓ Successfully updated metadata for post ${post_id} (HTTP ${http_code})!${NC}"
  else
    echo -e "${YELLOW}⚠ Warning: Collab metadata update returned HTTP ${http_code}: ${body}${NC}"
  fi
}

# ==============================================================================
# Unified Pipeline for a Single Post and its List of Collaborators
# ==============================================================================
execute_post_collab_pipeline() {
  local creator="$1"
  local shortcode="$2"
  local post_id="$3"
  local mode="$4"
  shift 4
  local -a targets=("$@")

  echo -e "${MAGENTA}====================================================================${NC}"
  echo -e "${MAGENTA} Collab Pipeline for Post: ${shortcode} (ID: ${post_id:-N/A})${NC}"
  echo -e "${MAGENTA} Creator: @${creator} | Intended Collaborators (${#targets[@]}): ${targets[*]}${NC}"
  echo -e "${MAGENTA} Strategy: ${STRATEGY^^} | Mode: ${mode}${NC}"
  echo -e "${MAGENTA}====================================================================${NC}"

  local -a successful_collabs=()

  if [[ "$STRATEGY" == "batch" ]]; then
    # --------------------------------------------------------------------------
    # Strategy A (Batch):
    # 1. Creator invites ALL target accounts in ONE editing session
    # 2. Each target account accepts sequentially (switching directly between collaborator accounts)
    # --------------------------------------------------------------------------
    local invite_succeeded=false

    if [[ "$mode" == "full" || "$mode" == "invite_only" ]]; then
      if run_maestro_batch_invite "$MAESTRO_DIR/instagram_collab_invite.yaml" "$creator" "$shortcode" "${targets[@]}"; then
        invite_succeeded=true
      else
        echo -e "${RED}Batch invite failed for post ${shortcode}.${NC}"
      fi

      if [[ "$mode" == "full" && "$invite_succeeded" == "true" ]]; then
        echo -e "${YELLOW}Settling for ${SETTLE_DELAY}s before starting collaborator acceptance cycle...${NC}"
        sleep "$SETTLE_DELAY"
      fi
    fi

    # Phase 2: Sequential Streamlined Accepts
    if [[ ("$mode" == "full" && "$invite_succeeded" == "true") || "$mode" == "accept_only" ]]; then
      local c_idx=1
      local total_c=${#targets[@]}
      for collab in "${targets[@]}"; do
        echo -e "${CYAN}--------------------------------------------------------------------${NC}"
        echo -e "${CYAN} [Phase 2: Accept ($c_idx/$total_c)] Switching account to @${collab}...${NC}"
        echo -e "${CYAN}--------------------------------------------------------------------${NC}"

        if run_maestro_flow "$MAESTRO_DIR/instagram_collab_accept.yaml" "$creator" "$collab" "$shortcode" "Phase 2 (Accept)"; then
          successful_collabs+=("$collab")
        else
          echo -e "${RED}Acceptance flow failed for @${collab} on post ${shortcode}.${NC}"
        fi

        c_idx=$((c_idx + 1))
        if [[ $c_idx -le $total_c ]]; then
          echo -e "${YELLOW}Settling for ${SETTLE_DELAY}s before next collaborator account switch...${NC}"
          sleep "$SETTLE_DELAY"
        fi
      done
    fi

  else
    # --------------------------------------------------------------------------
    # Strategy B (Pairwise):
    # Ping-pong between Creator and Collaborator one by one
    # --------------------------------------------------------------------------
    for target_collab in "${targets[@]}"; do
      if execute_collab_pair "$creator" "$target_collab" "$shortcode" "$mode"; then
        successful_collabs+=("$target_collab")
      else
        echo -e "${RED}Collaboration failed for @${target_collab} on post ${shortcode}.${NC}"
      fi

      echo -e "${YELLOW}Settling for ${SETTLE_DELAY}s before next account...${NC}"
      sleep "$SETTLE_DELAY"
    done
  fi

  # Update post metadata if post-id was provided and any collabs succeeded
  if [[ ${#successful_collabs[@]} -gt 0 && -n "$post_id" ]]; then
    local collabs_json
    collabs_json=$(printf '%s\n' "${successful_collabs[@]}" | jq -R . | jq -s .)
    post_completion_metadata "$post_id" "$collabs_json"
  fi

  echo -e "${GREEN}====================================================================${NC}"
  echo -e "${GREEN}   Pipeline Complete for Post ${shortcode}! Established: ${successful_collabs[*]}   ${NC}"
  echo -e "${GREEN}====================================================================${NC}"
  echo ""
}

# ==============================================================================
# Mode A: Process Queue
# ==============================================================================
run_queue_mode() {
  echo -e "${MAGENTA}Mode: Collab Automation Queue Processing${NC}"
  echo -e "${BLUE}API Endpoint : ${API_BASE_URL}/api/v1/insta/collab-planner/queue${NC}"
  echo -e "${BLUE}Strategy     : ${STRATEGY^^} (Simultaneous batch invite + streamlined accept)${NC}"
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

    local p_id p_shortcode p_url p_creator
    p_id=$(echo "$post" | jq -r '.postId // .id // .post_id // ""')
    p_shortcode=$(echo "$post" | jq -r '.shortcode // .shortCode // .short_code // ""')
    p_url=$(echo "$post" | jq -r '.videoUrl // .video_url // .url // .permalink // ""')
    p_creator=$(echo "$post" | jq -r '.creatorAccount // .creator_account // .ownerUsername // .username // "vayyari_fashions"')

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
    done < <(echo "$post" | jq -r '.targetCollabAccounts[]? // .target_collab_accounts[]? // empty')

    if [[ ${#target_accounts[@]} -eq 0 ]]; then
      echo -e "${YELLOW}Post ${p_shortcode} (ID: ${p_id}) has no target collaboration accounts queued.${NC}"
      i=$(( i + 1 ))
      continue
    fi

    execute_post_collab_pipeline "$p_creator" "$p_shortcode" "$p_id" "$MODE" "${target_accounts[@]}"

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

  execute_post_collab_pipeline "$CREATOR" "$shortcode" "$POST_ID" "$MODE" "${clean_collabs[@]}"
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
