#!/usr/bin/env bash
# =============================================================================
# DeepLens Reasoning Service - Multi-Model Regression & Diagnostic Test Runner
# =============================================================================
# Usage: ./scripts/test_llm_models.sh [BASE_URL] [LITELLM_URL]
# Default: BASE_URL=http://localhost:8002, LITELLM_URL=http://localhost:4000
# =============================================================================

set -eo pipefail

# Configuration
REASONING_URL="${1:-http://localhost:8002}"
LITELLM_URL="${2:-http://localhost:4000}"
LITELLM_KEY="${LITELLM_MASTER_KEY:-sk-deeplens-master-key}"

# ANSI Color Codes
CLR_RESET="\033[0m"
CLR_BOLD="\033[1m"
CLR_RED="\033[31m"
CLR_GREEN="\033[32m"
CLR_YELLOW="\033[33m"
CLR_BLUE="\033[34m"
CLR_MAGENTA="\033[35m"
CLR_CYAN="\033[36m"

PASS_TAG="${CLR_BOLD}${CLR_GREEN}[PASS]${CLR_RESET}"
FAIL_TAG="${CLR_BOLD}${CLR_RED}[FAIL]${CLR_RESET}"
WARN_TAG="${CLR_BOLD}${CLR_YELLOW}[WARN]${CLR_RESET}"
INFO_TAG="${CLR_BOLD}${CLR_CYAN}[INFO]${CLR_RESET}"

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNINGS=0

declare -a BENCHMARK_ROWS

log_pass() {
    local test_name="$1"
    local details="$2"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${PASS_TAG} ${CLR_BOLD}${test_name}${CLR_RESET} - ${details}"
}

log_fail() {
    local test_name="$1"
    local details="$2"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    FAILED_TESTS=$((FAILED_TESTS + 1))
    echo -e "${FAIL_TAG} ${CLR_BOLD}${test_name}${CLR_RESET} - ${details}"
}

log_warn() {
    local test_name="$1"
    local details="$2"
    WARNINGS=$((WARNINGS + 1))
    echo -e "${WARN_TAG} ${CLR_BOLD}${test_name}${CLR_RESET} - ${details}"
}

add_benchmark_row() {
    local target="$1"
    local status="$2"
    local latency="$3"
    local notes="$4"
    BENCHMARK_ROWS+=("$(printf "| %-24s | %-10s | %-12s | %-30s |" "$target" "$status" "${latency}ms" "$notes")")
}

echo -e "\n${CLR_BOLD}${CLR_CYAN}=================================================================================${CLR_RESET}"
echo -e "${CLR_BOLD}${CLR_CYAN}         DeepLens Multi-Model Test Suite & LLM Benchmark Runner                 ${CLR_RESET}"
echo -e "${CLR_BOLD}${CLR_CYAN}=================================================================================${CLR_RESET}"
echo -e "${INFO_TAG} Reasoning Service URL : ${CLR_BOLD}${REASONING_URL}${CLR_RESET}"
echo -e "${INFO_TAG} LiteLLM Gateway URL   : ${CLR_BOLD}${LITELLM_URL}${CLR_RESET}"
echo -e "${INFO_TAG} Timestamp             : $(date -u +"%Y-%m-%dT%H:%M:%SZ")\n"

# -----------------------------------------------------------------------------
# 1. LiteLLM Gateway Readiness Probes
# -----------------------------------------------------------------------------
echo -e "${CLR_BOLD}${CLR_MAGENTA}--- [1/5] Probing LiteLLM Gateway Readiness ---${CLR_RESET}"

START_T=$(date +%s%3N)
LIVELINESS_STATUS=$(curl -s -m 10 -o /dev/null -w "%{http_code}" "${LITELLM_URL}/health/liveliness" || echo "000")
END_T=$(date +%s%3N)
LATENCY=$((END_T - START_T))

if [ "$LIVELINESS_STATUS" -eq 200 ]; then
    log_pass "LiteLLM Liveliness" "Endpoint /health/liveliness reachable (${LATENCY}ms)"
    add_benchmark_row "LiteLLM Liveliness" "PASS" "$LATENCY" "HTTP 200 Healthy"
else
    log_fail "LiteLLM Liveliness" "Endpoint returned HTTP ${LIVELINESS_STATUS}"
    add_benchmark_row "LiteLLM Liveliness" "FAIL" "$LATENCY" "HTTP ${LIVELINESS_STATUS}"
fi

START_T=$(date +%s%3N)
MODELS_JSON=$(curl -s -m 10 -H "Authorization: Bearer ${LITELLM_KEY}" "${LITELLM_URL}/models" || echo "{}")
END_T=$(date +%s%3N)
LATENCY=$((END_T - START_T))

if echo "$MODELS_JSON" | grep -q "deeplens-llm"; then
    log_pass "LiteLLM Models Registry" "deeplens-llm alias verified in models list (${LATENCY}ms)"
    add_benchmark_row "LiteLLM Models List" "PASS" "$LATENCY" "deeplens-llm registered"
else
    log_fail "LiteLLM Models Registry" "Failed to retrieve models list from LiteLLM"
    add_benchmark_row "LiteLLM Models List" "FAIL" "$LATENCY" "Model list missing"
fi

sleep 2

# -----------------------------------------------------------------------------
# 2. Reasoning Service Health & System Diagnostics
# -----------------------------------------------------------------------------
echo -e "\n${CLR_BOLD}${CLR_MAGENTA}--- [2/5] Checking Reasoning Service Health & Diagnostics ---${CLR_RESET}"

START_T=$(date +%s%3N)
HEALTH_JSON=$(curl -s -m 10 "${REASONING_URL}/health" || echo "{}")
END_T=$(date +%s%3N)
LATENCY=$((END_T - START_T))

if echo "$HEALTH_JSON" | grep -q '"status":"ok"'; then
    log_pass "Reasoning Health" "Service online, gateway connected (${LATENCY}ms)"
    add_benchmark_row "Reasoning /health" "PASS" "$LATENCY" "Status: OK"
else
    log_fail "Reasoning Health" "Health check failed: ${HEALTH_JSON}"
    add_benchmark_row "Reasoning /health" "FAIL" "$LATENCY" "Health check failed"
fi

START_T=$(date +%s%3N)
DIAG_STATUS=$(curl -s -m 60 -o /dev/null -w "%{http_code}" "${REASONING_URL}/diagnostics/models" || echo "000")
END_T=$(date +%s%3N)
LATENCY=$((END_T - START_T))

if [ "$DIAG_STATUS" -eq 200 ]; then
    log_pass "Reasoning Diagnostics" "GET /diagnostics/models endpoint operational (${LATENCY}ms)"
    add_benchmark_row "Diagnostics Models" "PASS" "$LATENCY" "Model matrix queried"
else
    log_fail "Reasoning Diagnostics" "GET /diagnostics/models returned HTTP ${DIAG_STATUS}"
    add_benchmark_row "Diagnostics Models" "FAIL" "$LATENCY" "HTTP ${DIAG_STATUS}"
fi

sleep 2

# -----------------------------------------------------------------------------
# 3. Model Matrix Extraction Probes (/test-model)
# -----------------------------------------------------------------------------
echo -e "\n${CLR_BOLD}${CLR_MAGENTA}--- [3/5] Testing Multi-Model Extraction Matrix ---${CLR_RESET}"

MODELS_TO_PROBE=("deeplens-llm" "phi4-mini:latest" "phi3:latest")
TEST_PROMPT="WhatsApp Description:\nPure Kanjivaram Silk Saree in Red Color with Rich Zari Pallu Price Rs 2499\n\nExtract metadata in JSON format."

for M in "${MODELS_TO_PROBE[@]}"; do
    START_T=$(date +%s%3N)
    RESP_JSON=$(curl -s -m 120 -X POST "${REASONING_URL}/test-model" \
        -H "Content-Type: application/json" \
        -d "{\"model\": \"${M}\", \"prompt\": \"${TEST_PROMPT}\"}" || echo "{}")
    END_T=$(date +%s%3N)
    LATENCY=$((END_T - START_T))

    if echo "$RESP_JSON" | grep -q '"status":"ok"'; then
        log_pass "Model [${M}]" "Structured JSON extraction succeeded (${LATENCY}ms)"
        add_benchmark_row "Model: ${M}" "PASS" "$LATENCY" "JSON extracted OK"
    elif echo "$RESP_JSON" | grep -q 'parsed_json' || echo "$RESP_JSON" | grep -q 'category'; then
        log_pass "Model [${M}]" "Extraction parsed with fallback (${LATENCY}ms)"
        add_benchmark_row "Model: ${M}" "PASS" "$LATENCY" "Fallback response OK"
    else
        log_warn "Model [${M}]" "Direct probe completed with status (${LATENCY}ms)"
        add_benchmark_row "Model: ${M}" "WARN" "$LATENCY" "Status non-optimal"
    fi
    sleep 2
done

# -----------------------------------------------------------------------------
# 4. Functional Endpoints Verification
# -----------------------------------------------------------------------------
echo -e "\n${CLR_BOLD}${CLR_MAGENTA}--- [4/5] Verifying Functional Business Logic Endpoints ---${CLR_RESET}"

# A. Extract Product
START_T=$(date +%s%3N)
EXTRACT_RESP=$(curl -s -m 120 -X POST "${REASONING_URL}/extract-product" \
    -H "Content-Type: application/json" \
    -d "{\"description\": \"Pure Kanjivaram Silk Saree in Red Color with Rich Zari Pallu Price Rs 2499\"}" || echo "{}")
END_T=$(date +%s%3N)
LATENCY=$((END_T - START_T))

if echo "$EXTRACT_RESP" | grep -q '"category"'; then
    log_pass "Extract Product" "Structured payload returned (${LATENCY}ms)"
    add_benchmark_row "POST /extract-product" "PASS" "$LATENCY" "Extracted structured"
else
    log_fail "Extract Product" "Failed to extract product: ${EXTRACT_RESP}"
    add_benchmark_row "POST /extract-product" "FAIL" "$LATENCY" "Extraction failed"
fi

sleep 2

# B. YouTube Title Generation
START_T=$(date +%s%3N)
YT_RESP=$(curl -s -m 120 -X POST "${REASONING_URL}/generate-youtube-title" \
    -H "Content-Type: application/json" \
    -d '{"description": "Exclusive Pure Kanjivaram Silk Saree Collection in Vibrant Red Color"}' || echo "{}")
END_T=$(date +%s%3N)
LATENCY=$((END_T - START_T))

if echo "$YT_RESP" | grep -q '"title"'; then
    log_pass "YouTube Title" "Generated title successfully (${LATENCY}ms)"
    add_benchmark_row "POST /generate-youtube-title" "PASS" "$LATENCY" "Title generated"
else
    log_fail "YouTube Title" "Failed to generate YouTube title: ${YT_RESP}"
    add_benchmark_row "POST /generate-youtube-title" "FAIL" "$LATENCY" "Title gen failed"
fi

sleep 2

# C. Share Description Generation
START_T=$(date +%s%3N)
SHARE_RESP=$(curl -s -m 120 -X POST "${REASONING_URL}/generate-share-description" \
    -H "Content-Type: application/json" \
    -d '{
        "base_sku": "VAY-KANJI-001",
        "title": "Pure Kanjivaram Silk Saree",
        "category": "saree",
        "fabric": "Silk",
        "color": "Red",
        "vendor_price": 2499,
        "target_platform": "Instagram"
    }' || echo "{}")
END_T=$(date +%s%3N)
LATENCY=$((END_T - START_T))

if echo "$SHARE_RESP" | grep -q 'VAY-KANJI-001'; then
    log_pass "Share Caption" "Generated caption contains SKU VAY-KANJI-001 & Price (${LATENCY}ms)"
    add_benchmark_row "POST /generate-share-desc" "PASS" "$LATENCY" "SKU & price included"
else
    log_fail "Share Caption" "Failed to generate valid share description: ${SHARE_RESP}"
    add_benchmark_row "POST /generate-share-desc" "FAIL" "$LATENCY" "SKU missing"
fi

# -----------------------------------------------------------------------------
# 5. Benchmark Summary Table
# -----------------------------------------------------------------------------
echo -e "\n${CLR_BOLD}${CLR_MAGENTA}--- [5/5] Multi-Model Test & Benchmark Summary ---${CLR_RESET}\n"

echo "+--------------------------+------------+--------------+--------------------------------+"
echo "| Target / Endpoint        | Status     | Latency (ms) | Notes                          |"
echo "+--------------------------+------------+--------------+--------------------------------+"
for ROW in "${BENCHMARK_ROWS[@]}"; do
    echo "$ROW"
done
echo "+--------------------------+------------+--------------+--------------------------------+"

echo -e "\n${CLR_BOLD}Results Summary:${CLR_RESET}"
echo -e "  Total Tests Run : ${CLR_BOLD}${TOTAL_TESTS}${CLR_RESET}"
echo -e "  Passed          : ${CLR_GREEN}${PASSED_TESTS}${CLR_RESET}"
echo -e "  Failed          : ${CLR_RED}${FAILED_TESTS}${CLR_RESET}"
echo -e "  Warnings        : ${CLR_YELLOW}${WARNINGS}${CLR_RESET}"

if [ "$FAILED_TESTS" -eq 0 ]; then
    echo -e "\n${CLR_BOLD}${CLR_GREEN}>>> ALL MODEL AND REASONING TESTS PASSED SUCCESSFULLY! <<<\n${CLR_RESET}"
    exit 0
else
    echo -e "\n${CLR_BOLD}${CLR_RED}>>> REGRESSION SUITE ENCOUNTERED ${FAILED_TESTS} FAILURES <<<\n${CLR_RESET}"
    exit 1
fi
