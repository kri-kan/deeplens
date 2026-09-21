#!/usr/bin/env bash
# ==============================================================================
# Vayyari Multi-Channel Instagram Collaboration Automation Runner
#
# Supports:
#   Mode A (Queue): Runs queued jobs from DeepLens Collab Automation Queue
#   Mode B (CLI):   Explicit creator, shortcode, and multi-account collaborators
#
# Usage:
#   # Mode A: Fetch and execute from Collab Automation Queue
#   ./maestro/run_collab_cycle.sh --queue
#   ./maestro/run_collab_cycle.sh --mode queue --api-url http://localhost:5000
#
#   # Mode B: Run with explicit post and multiple target collaborator accounts
#   ./maestro/run_collab_cycle.sh --creator vayyari_fashions \
#       --shortcode DdYD1MOEzQt \
#       --collabs "theblouseedition,vayyari_littles" \
#       --post-id 3fa85f64-5717-4562-b3fc-2c963f66afa6
#
#   # Single account legacy syntax
#   ./maestro/run_collab_cycle.sh --collab dressbyvayyari --shortcode DAxyz123
#
#   # Dry run inspection
#   ./maestro/run_collab_cycle.sh --queue --dry-run
# ==============================================================================

set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

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
  echo -e "${CYAN}====================================================================${NC}"
}

usage() {
  echo -e "Usage: $0 [OPTIONS]"
  echo ""
  echo "Modes:"
  echo "  --queue, --from-queue       Consume posts from Collab Automation Queue (Mode A)"
  echo "  --mode <mode>               Execution mode:"
  echo "                              'full' (default: invite + accept)"
  echo "                              'invite_only' (Phase 1 only)"
  echo "                              'accept_only' (Phase 2 only)"
  echo "                              'queue' (Alias for --queue)"
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
    --mode)
      MODE="$2"
      if [[ "$MODE" == "queue" ]]; then
        IS_QUEUE_MODE=true
      fi
      shift 2
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

execute_collab_pair() {
  local creator="$1"
  local collab="$2"
  local shortcode="$3"
  local mode="$4"

  echo -e "${CYAN}--------------------------------------------------------------------${NC}"
  echo -e "${CYAN} Executing Collab Cycle: Creator @${creator} <--> Collab @${collab}${NC}"
  echo -e "${CYAN} Post Shortcode: ${shortcode}${NC}"
  echo -e "${CYAN}--------------------------------------------------------------------${NC}"

  # Phase 1: Creator Invites Collaborator
  if [[ "$mode" == "full" || "$mode" == "invite_only" ]]; then
    if ! run_maestro_flow "$SCRIPT_DIR/instagram_collab_invite.yaml" "$creator" "$collab" "$shortcode" "Phase 1 (Invite)"; then
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
    if ! run_maestro_flow "$SCRIPT_DIR/instagram_collab_accept.yaml" "$creator" "$collab" "$shortcode" "Phase 2 (Accept)"; then
      echo -e "${RED}Phase 2 failed for @${collab}.${NC}"
      return 1
    fi
  fi

  echo -e "${GREEN}✓ Collaboration cycle successfully established for @${collab}!${NC}"
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
# Mode A: Process Queue
# ==============================================================================
run_queue_mode() {
  echo -e "${MAGENTA}Mode: Collab Automation Queue Processing${NC}"
  echo -e "${BLUE}API Endpoint : ${API_BASE_URL}/api/v1/insta/collab-planner/queue${NC}"
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
      echo -e "${RED}Skipping item $((i+1)): Missing shortcode or videoUrl for post ${p_id}.${NC}"
      i=$((i+1))
      continue
    fi

    local target_handles_raw
    target_handles_raw=$(echo "$post" | jq -r '
      (.targetCollabAccounts // .target_collab_accounts // .collaborators // []) as $t |
      (if ($t | type) == "string" then ($t | fromjson? // ($t | split(","))) else $t end) |
      if type == "array" then
        .[] | if type == "object" then (.username // .handle // "") else tostring end
      else
        empty
      end
    ' | sed 's/^[ @]*//; s/[ @]*$//' | grep -v '^$' | head -n 5)

    if [[ -z "$target_handles_raw" ]]; then
      echo -e "${YELLOW}Skipping item $((i+1)): Post ${p_id} has no target collab accounts queued.${NC}"
      i=$((i+1))
      continue
    fi

    echo -e "${MAGENTA}====================================================================${NC}"
    echo -e "${MAGENTA} Processing Queue Item $((i+1))/${queue_len}: Post ${p_id} (${p_shortcode})${NC}"
    echo -e "${MAGENTA} Creator: @${p_creator}${NC}"
    echo -e "${MAGENTA}====================================================================${NC}"

    local successful_collabs=()
    while read -r handle; do
      [[ -z "$handle" ]] && continue
      echo -e "${BLUE}-> Target Collaborator: @${handle}${NC}"
      if execute_collab_pair "$p_creator" "$handle" "$p_shortcode" "$MODE"; then
        successful_collabs+=("$handle")
      fi
      echo -e "${YELLOW}Settling for ${SETTLE_DELAY}s before next collaborator...${NC}"
      sleep "$SETTLE_DELAY"
    done <<< "$target_handles_raw"

    # If any collaborations completed, update metadata
    if [[ ${#successful_collabs[@]} -gt 0 && -n "$p_id" ]]; then
      local collabs_json
      collabs_json=$(printf '%s\n' "${successful_collabs[@]}" | jq -R . | jq -s .)
      post_completion_metadata "$p_id" "$collabs_json"
    fi

    i=$((i+1))
  done

  echo -e "${GREEN}====================================================================${NC}"
  echo -e "${GREEN}   Collab Automation Queue Processing Completed Successfully!       ${NC}"
  echo -e "${GREEN}====================================================================${NC}"
}

# ==============================================================================
# Mode B: Direct CLI Execution
# ==============================================================================
run_cli_mode() {
  echo -e "${MAGENTA}Mode: Direct CLI Collaboration Run${NC}"

  if [[ -z "$COLLABS_INPUT" ]]; then
    echo -e "${RED}Error: --collabs <handles> (or --collab <handle>) is required in CLI mode!${NC}"
    usage
  fi

  if [[ -z "$SHORTCODE" ]]; then
    echo -e "${RED}Error: --shortcode <code> is required in CLI mode!${NC}"
    usage
  fi

  SHORTCODE=$(extract_shortcode "$SHORTCODE")

  if [[ "$MODE" != "full" && "$MODE" != "invite_only" && "$MODE" != "accept_only" ]]; then
    echo -e "${RED}Error: Invalid mode '$MODE'. Must be 'full', 'invite_only', or 'accept_only'.${NC}"
    exit 1
  fi

  # Split comma-separated handles and clean
  local target_handles=()
  IFS=',' read -ra ADDR <<< "$COLLABS_INPUT"
  for h in "${ADDR[@]}"; do
    local clean_h
    clean_h=$(echo "$h" | sed 's/^[ @]*//; s/[ @]*$//')
    if [[ -n "$clean_h" ]]; then
      target_handles+=("$clean_h")
    fi
  done

  if [[ ${#target_handles[@]} -eq 0 ]]; then
    echo -e "${RED}Error: No valid collaborator handles provided in --collabs!${NC}"
    exit 1
  fi

  # Enforce maximum 5 collaborator handles
  if [[ ${#target_handles[@]} -gt 5 ]]; then
    echo -e "${YELLOW}Notice: More than 5 collaborators provided. Capping at first 5 accounts.${NC}"
    target_handles=("${target_handles[@]:0:5}")
  fi

  echo -e "${BLUE}Parameters:${NC}"
  echo -e "  Creator Account   : ${GREEN}@${CREATOR}${NC}"
  echo -e "  Collab Accounts   : ${GREEN}${target_handles[*]}${NC}"
  echo -e "  Post Shortcode    : ${YELLOW}${SHORTCODE}${NC}"
  echo -e "  Post ID           : ${YELLOW}${POST_ID:-N/A}${NC}"
  echo -e "  Execution Mode    : ${CYAN}${MODE}${NC}"
  echo ""

  check_device

  local successful_collabs=()
  for handle in "${target_handles[@]}"; do
    echo -e "${BLUE}-> Initiating Collab for @${handle}...${NC}"
    if execute_collab_pair "$CREATOR" "$handle" "$SHORTCODE" "$MODE"; then
      successful_collabs+=("$handle")
    fi
    echo -e "${YELLOW}Settling for ${SETTLE_DELAY}s before next account...${NC}"
    sleep "$SETTLE_DELAY"
  done

  # Update post metadata if post-id was provided and any collabs succeeded
  if [[ ${#successful_collabs[@]} -gt 0 && -n "$POST_ID" ]]; then
    local collabs_json
    collabs_json=$(printf '%s\n' "${successful_collabs[@]}" | jq -R . | jq -s .)
    post_completion_metadata "$POST_ID" "$collabs_json"
  fi

  echo -e "${GREEN}====================================================================${NC}"
  echo -e "${GREEN}   Collaboration Cycle Completed for: ${successful_collabs[*]}   ${NC}"
  echo -e "${GREEN}====================================================================${NC}"
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
