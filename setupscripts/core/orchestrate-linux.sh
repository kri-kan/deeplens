#!/bin/bash

# Ensure we are in the script's directory for relative paths to work
cd "$(dirname "${BASH_SOURCE[0]}")"
 
# --- DeepLens Linux Orchestrator ---
# Unified management for the 192.168.0.170 stack
 
ACTION=${1:-status}
SERVICE=$2
PROJECT_NAME="deeplens"
 
# Colors
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color
 
echo -e "${CYAN}--- DeepLens Service Orchestrator (Linux) ---${NC}"
if [ ! -z "$SERVICE" ]; then echo -e "Target: $SERVICE"; fi
 
case $ACTION in
    setup-network)
        echo -e "${YELLOW}Creating unified 'deeplens-network'...${NC}"
        bash ./network_setup.sh
        echo -e "${GREEN}[OK] Network verified.${NC}"
        ;;
 
    start)
        echo -e "Validating network..."
        bash ./orchestrate-linux.sh setup-network > /dev/null
        
        echo -e "${YELLOW}Bringing up service(s)...${NC}"
        docker compose -p $PROJECT_NAME up -d $SERVICE
        echo -e "${GREEN}[OK] Start command issued.${NC}"
        ;;
 
    stop)
        if [ ! -z "$SERVICE" ]; then
            echo -e "${YELLOW}Stopping service '$SERVICE'...${NC}"
            docker compose -p $PROJECT_NAME stop $SERVICE
            echo -e "${GREEN}[OK] Service stopped.${NC}"
        else
            echo -e "${YELLOW}Tearing down ENTIRE stack...${NC}"
            docker compose -p $PROJECT_NAME down
            echo -e "${GREEN}[OK] Stack stopped.${NC}"
        fi
        ;;
 
    status)
        echo -e "Service Status:"
        docker compose -p $PROJECT_NAME ps $SERVICE
        ;;
 
    logs)
        docker compose -p $PROJECT_NAME logs -f --tail 100 $SERVICE
        ;;
 
    clean)
        echo -e "${YELLOW}Pruning unused docker objects...${NC}"
        docker system prune -f
        echo -e "${GREEN}[OK] Cleanup complete.${NC}"
        ;;
 
    validate)
        bash ./validate-stack.sh
        ;;
 
    fix-permissions)
        echo -e "${YELLOW}Fixing host directory permissions via Docker helper...${NC}"
        # Use a temporary container to fix permissions on the host volume
        docker run --rm -v /data:/data alpine chown -R 1000:1000 /data
        docker run --rm -v /data:/data alpine chmod -R 775 /data
        echo -e "${GREEN}[OK] Permissions unified.${NC}"
        ;;
 
    *)
        echo "Usage: $0 {start|stop|status|clean|logs|setup-network} [service_name]"
        exit 1
        ;;
esac
