#!/usr/bin/env bash
# ==============================================================================
# Vayyari Multi-Channel Instagram Collaboration Automation Runner
#
# Usage:
#   ./maestro/run_collab_cycle.sh --collab dressbyvayyari --shortcode DAxyz123
#   ./maestro/run_collab_cycle.sh --creator vayyari_fashions --collab theblouseedition --shortcode DAxyz123 --mode full
#   ./maestro/run_collab_cycle.sh --collab dressbyvayyari --shortcode DAxyz123 --mode accept_only
# ==============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Defaults
CREATOR="vayyari_fashions"
COLLAB=""
SHORTCODE=""
MODE="full"
DEVICE=""

print_banner() {
  echo -e "${CYAN}====================================================================${NC}"
  echo -e "${CYAN}   Vayyari Instagram Multi-Channel Collaboration Automation Runner   ${NC}"
  echo -e "${CYAN}====================================================================${NC}"
}

usage() {
  echo -e "Usage: $0 [OPTIONS]"
  echo ""
  echo "Options:"
  echo "  --creator <handle>    Source creator account (default: 'vayyari_fashions')"
  echo "  --collab <handle>     Target collaborator account (REQUIRED)"
  echo "  --shortcode <code>    Instagram post shortcode (REQUIRED)"
  echo "  --mode <mode>         Execution mode: 'full' (default), 'invite_only', 'accept_only'"
  echo "  --device <id>         Target ADB device ID (default: auto-detected)"
  echo "  -h, --help            Show this help message"
  echo ""
  exit 0
}

# Parse command line flags
while [[ $# -gt 0 ]]; do
  case $1 in
    --creator)
      CREATOR="$2"
      shift 2
      ;;
    --collab)
      COLLAB="$2"
      shift 2
      ;;
    --shortcode)
      SHORTCODE="$2"
      shift 2
      ;;
    --mode)
      MODE="$2"
      shift 2
      ;;
    --device)
      DEVICE="$2"
      shift 2
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

print_banner

# Validations
if [[ -z "$COLLAB" ]]; then
  echo -e "${RED}Error: --collab <handle> is required!${NC}"
  usage
fi

if [[ -z "$SHORTCODE" ]]; then
  echo -e "${RED}Error: --shortcode <code> is required!${NC}"
  usage
fi

if [[ "$MODE" != "full" && "$MODE" != "invite_only" && "$MODE" != "accept_only" ]]; then
  echo -e "${RED}Error: Invalid mode '$MODE'. Must be 'full', 'invite_only', or 'accept_only'.${NC}"
  exit 1
fi

echo -e "${BLUE}Parameters:${NC}"
echo -e "  Creator Account   : ${GREEN}@${CREATOR}${NC}"
echo -e "  Collab Account    : ${GREEN}@${COLLAB}${NC}"
echo -e "  Post Shortcode    : ${YELLOW}${SHORTCODE}${NC}"
echo -e "  Execution Mode    : ${CYAN}${MODE}${NC}"
echo ""

# Check adb connection
echo -e "${BLUE}==> Checking connected devices...${NC}"
CONNECTED_DEVICES=$(adb devices | grep -v "List of devices" | grep "device$" | awk '{print $1}')

if [[ -z "$CONNECTED_DEVICES" ]]; then
  echo -e "${RED}Error: No Android device or emulator connected via adb!${NC}"
  exit 1
fi

if [[ -z "$DEVICE" ]]; then
  DEVICE=$(echo "$CONNECTED_DEVICES" | head -n 1)
fi

echo -e "${GREEN}Using target device: $DEVICE${NC}"
echo ""

# Phase 1: Creator Invites Collaborator
if [[ "$MODE" == "full" || "$MODE" == "invite_only" ]]; then
  echo -e "${CYAN}--------------------------------------------------------------------${NC}"
  echo -e "${CYAN} Phase 1: Inviting @${COLLAB} from Creator Account @${CREATOR}     ${NC}"
  echo -e "${CYAN}--------------------------------------------------------------------${NC}"

  maestro --device "$DEVICE" test \
    -e CREATOR_ACCOUNT="$CREATOR" \
    -e COLLAB_HANDLE="$COLLAB" \
    -e SHORTCODE="$SHORTCODE" \
    "$SCRIPT_DIR/instagram_collab_invite.yaml"

  echo -e "${GREEN}✓ Phase 1 Completed: Collab invite sent to @${COLLAB}!${NC}"
  echo ""
  
  if [[ "$MODE" == "full" ]]; then
    echo -e "${YELLOW}Settling for 4 seconds before profile switch...${NC}"
    sleep 4
  fi
fi

# Phase 2: Switch Profile & Accept Collaboration
if [[ "$MODE" == "full" || "$MODE" == "accept_only" ]]; then
  echo -e "${CYAN}--------------------------------------------------------------------${NC}"
  echo -e "${CYAN} Phase 2: Switching to @${COLLAB} & Accepting Collab Invite         ${NC}"
  echo -e "${CYAN}--------------------------------------------------------------------${NC}"

  maestro --device "$DEVICE" test \
    -e CREATOR_ACCOUNT="$CREATOR" \
    -e COLLAB_HANDLE="$COLLAB" \
    -e SHORTCODE="$SHORTCODE" \
    "$SCRIPT_DIR/instagram_collab_accept.yaml"

  echo -e "${GREEN}✓ Phase 2 Completed: @${COLLAB} has reviewed and accepted collaboration!${NC}"
  echo ""
fi

echo -e "${GREEN}====================================================================${NC}"
echo -e "${GREEN}   Collaboration Cycle Successfully Completed for @${COLLAB}!       ${NC}"
echo -e "${GREEN}====================================================================${NC}"
