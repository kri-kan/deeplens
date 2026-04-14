#!/bin/bash
 
# --- DeepLens Infrastructure Validator ---
# Verifies container health and network responsiveness
 
# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
 
echo -e "${CYAN}==================================================${NC}"
echo -e "${CYAN}    DeepLens Infrastructure Health Validator      ${NC}"
echo -e "${CYAN}==================================================${NC}"
 
# 1. Container Status Check
echo -e "\n${YELLOW}[1/3] Checking Container States...${NC}"
SERVICES=("krikanpg" "pgadmin" "kafka-prod" "kafka-test" "kafka-ui" "minio" "redis" "qdrant" "influxdb" "grafana" "prometheus" "loki" "jaeger" "ollama-gpu" "open-webui" "otel-collector" "gateway")
 
for service in "${SERVICES[@]}"; do
    STATE=$(docker inspect -f '{{.State.Status}}' "$service" 2>/dev/null)
    if [ "$STATE" == "running" ]; then
        echo -e "  [${GREEN}PASS${NC}] $service is $STATE"
    else
        echo -e "  [${RED}FAIL${NC}] $service is ${STATE:-NOT FOUND}"
    fi
done
 
# 2. Port & Network Responsiveness
echo -e "\n${YELLOW}[2/3] Checking Service Responsiveness (HTTP/TCP)...${NC}"
 
check_http() {
    NAME=$1
    URL=$2
    CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
    if [[ "$CODE" =~ ^(200|301|302|401)$ ]]; then
        echo -e "  [${GREEN}OK${NC}] $NAME responded with HTTP $CODE"
    else
        echo -e "  [${RED}ERR${NC}] $NAME failed (HTTP $CODE)"
    fi
}
 
check_port() {
    NAME=$1
    PORT=$2
    (echo > /dev/tcp/localhost/$PORT) >/dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "  [${GREEN}OK${NC}] $NAME is listening on port $PORT"
    else
        echo -e "  [${RED}ERR${NC}] $NAME port $PORT is unreachable"
    fi
}
 
check_http "Gateway Console" "http://localhost/"
check_http "Grafana" "http://localhost:3000/api/health"
check_http "MinIO API" "http://localhost:9000/minio/health/live"
check_http "InfluxDB" "http://localhost:8086/health"
check_http "Prometheus" "http://localhost:9090/-/healthy"
check_port "PostgreSQL" 5432
check_port "Redis" 6379
check_port "Kafka" 9092
 
# 3. Gateway Routing Check
echo -e "\n${YELLOW}[3/3] Checking Gateway Proxy Routing...${NC}"
check_http "Proxy -> Grafana" "http://localhost/grafana/"
check_http "Proxy -> MinIO" "http://localhost/minio/"
check_http "Proxy -> pgAdmin" "http://localhost/pgadmin/"
 
echo -e "\n${CYAN}Validation Complete.${NC}"
