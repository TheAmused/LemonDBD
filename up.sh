#!/usr/bin/env bash
# up.sh
set -eo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

STRICT=false
DOWN=false
PERF=false
PERF_SUITE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    -s|--strict|-Strict)
      STRICT=true
      shift
      ;;
    -d|--down|-Down)
      DOWN=true
      shift
      ;;
    -p|--perf|-Perf)
      PERF=true
      if [[ -n "${2:-}" && ! "$2" =~ ^- ]]; then
        PERF_SUITE="$2"
        shift 2
      else
        PERF_SUITE="all"
        shift 1
      fi
      ;;
    -h|--help)
      echo "Usage: ./up.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -s, --strict        Fresh build (--no-cache) and runs dual-stack live tests"
      echo "  -p, --perf [SUITE]  Run K6 performance test suite(s). Defaults to 'all' (smoke, load, stress, spike, soak)"
      echo "  -d, --down          Stop and tear down Docker containers"
      echo "  -h, --help          Show this help message"
      exit 0
      ;;
    *)
      shift
      ;;
  esac
done

# Handle explicit teardown request
if [ "$DOWN" = true ]; then
  echo -e "${YELLOW}[STOP] Tearing down containers...${NC}"
  docker compose down
  exit 0
fi

# Verify k6 is available in PATH if perf testing requested
K6_CMD="k6"
if [ "$PERF" = true ]; then
  if ! command -v k6 &> /dev/null; then
    if command -v k6.exe &> /dev/null; then
      K6_CMD="k6.exe"
    else
      echo -e "\n${RED}[FAIL] k6 executable was not found in PATH!${NC}"
      echo -e "${RED}Please install k6 to run performance tests.${NC}"
      exit 1
    fi
  fi
fi

# If user just wants -Perf and containers are already running & healthy, we don't have to teardown/rebuild
SKIP_UP_FLOW=false
if [ "$PERF" = true ] && [ "$STRICT" = false ]; then
  if curl -s -f -m 3 "http://localhost:5000/api/v1/health" > /dev/null 2>&1 || curl -s -f -m 3 "http://localhost/api/v1/health" > /dev/null 2>&1; then
    echo -e "\n${CYAN}[INFO] Containers are already running and healthy. Skipping build & startup.${NC}"
    SKIP_UP_FLOW=true
  fi
fi

if [ "$SKIP_UP_FLOW" = false ]; then
  # ====================================================================
  # [STEP 0] Teardown Any Running Containers
  # ====================================================================
  echo -e "\n${CYAN}========================================================${NC}"
  echo -e "${CYAN} [Step 0] Stopping Existing Containers                  ${NC}"
  echo -e "${CYAN}========================================================${NC}"
  docker compose down

  # ====================================================================
  # [GATE 1] Pre-Flight: Dual-Stack Unit Tests (Local Machine)
  # ====================================================================
  echo -e "\n${CYAN}========================================================${NC}"
  echo -e "${CYAN} [Gate 1] Running Pre-Flight Unit Tests (Backend & Frontend)${NC}"
  echo -e "${CYAN}========================================================${NC}"

  export PYTHONPATH="$(pwd)/backend:${PYTHONPATH:-}"

  # 1.1 Backend Unit Tests
  echo -e "\n${YELLOW}> [1/2] Running Backend Unit Tests (pytest)...${NC}"
  PYTHON_CMD="python3"
  if ! command -v python3 &> /dev/null; then
    if command -v py &> /dev/null; then
      PYTHON_CMD="py"
    else
      PYTHON_CMD="python"
    fi
  fi

  if ! $PYTHON_CMD -m pytest backend/tests/unit -v --tb=short; then
    echo -e "\n${RED}[FAIL] Backend unit tests did not pass!${NC}"
    echo -e "${RED}[STOP] Docker build and startup has been ABORTED.${NC}"
    exit 1
  fi
  echo -e "${GREEN}[PASS] Backend Unit Tests Passed.${NC}"

  # 1.2 Frontend Unit Tests
  echo -e "\n${YELLOW}> [2/2] Running Frontend Unit Tests (npm run test:unit)...${NC}"
  if ! (cd frontend && npm run test:unit); then
    echo -e "\n${RED}[FAIL] Frontend unit tests did not pass!${NC}"
    echo -e "${RED}[STOP] Docker build and startup has been ABORTED.${NC}"
    exit 1
  fi
  echo -e "${GREEN}[PASS] Frontend Unit Tests Passed.${NC}"

  # ====================================================================
  # [GATE 2] Build & Start Docker Cluster
  # ====================================================================
  echo -e "\n${CYAN}========================================================${NC}"
  echo -e "${CYAN} [Gate 2] Building and Starting Docker Stack             ${NC}"
  echo -e "${CYAN}========================================================${NC}"

  if [ "$STRICT" = true ]; then
    echo -e "${YELLOW}> Strict Mode: Building all containers with --no-cache...${NC}"
    docker compose build --no-cache
    docker compose up -d --wait
  else
    echo -e "${YELLOW}> Standard Mode: Building with layer cache...${NC}"
    docker compose up -d --build --wait
  fi

  if [ $? -ne 0 ]; then
    echo -e "\n${RED}[FAIL] Docker Compose failed to start healthy containers!${NC}"
    exit 1
  fi
  echo -e "${GREEN}[PASS] All containers are UP and HEALTHY.${NC}"

  # [Gate 2b] Initial DBD data scrape readiness check
  # Wait for the initial character scrape to finish seeding the DB whenever
  # containers were freshly started and we need live or perf testing.
  if [ "$STRICT" = true ] || [ "$PERF" = true ]; then
    echo -e "\n${YELLOW}> Waiting for the initial character scrape to finish seeding the DB...${NC}"
    # NOTE: this queries Postgres directly through docker compose exec instead
    # of hitting the backend over the published host port.
    PG_USER="${POSTGRES_USER:-postgres}"
    PG_DB="${POSTGRES_DB:-dbd_db}"
    SCRAPE_READY=false
    for i in $(seq 1 60); do
      CHAR_COUNT=$(docker compose exec -T db psql -U "$PG_USER" -d "$PG_DB" -tAc "SELECT COUNT(*) FROM characters;" 2>/dev/null | tr -d '[:space:]')
      if ! [[ "$CHAR_COUNT" =~ ^[0-9]+$ ]]; then
        CHAR_COUNT=0
      fi
      CHAR_COUNT=${CHAR_COUNT:-0}
      if [ "$CHAR_COUNT" -ge 50 ] 2>/dev/null; then
        echo -e "${GREEN}[PASS] ${CHAR_COUNT} characters seeded -- data is ready.${NC}"
        SCRAPE_READY=true
        break
      fi
      echo -e "${YELLOW}  ... ${CHAR_COUNT}/50+ characters so far, waiting (${i}/60, ~3 min max)...${NC}"
      sleep 3
    done
    if [ "$SCRAPE_READY" != true ]; then
      echo -e "${RED}[WARN] Character data still not seeded after 3 minutes -- continuing anyway, but tests may fail. Check 'docker compose logs backend' for scrape errors.${NC}"
    fi
  fi

  # ====================================================================
  # [GATE 3] Strict Mode: Live E2E Integration Tests
  # ====================================================================
  if [ "$STRICT" = true ]; then
    echo -e "\n${MAGENTA}========================================================${NC}"
    echo -e "${MAGENTA} [Gate 3] Strict Mode: Running Dual-Stack Live Tests     ${NC}"
    echo -e "${MAGENTA}========================================================${NC}"

    # 3.1 Backend Live Tests
    echo -e "\n${YELLOW}> [1/2] Running Backend Live Tests (PostgreSQL Clone)...${NC}"
    export POSTGRES_HOST=127.0.0.1
    export POSTGRES_PORT=5432

    if ! $PYTHON_CMD -m pytest backend/tests/live -v; then
      echo -e "\n${RED}[FAIL] Backend Live Tests Failed!${NC}"
      exit 1
    fi
    echo -e "${GREEN}[PASS] Backend live tests passed.${NC}"

    # 3.2 Frontend Live Tests
    echo -e "\n${YELLOW}> [2/2] Running Frontend Live Tests (Next.js)...${NC}"
    if ! (cd frontend && npm run test:live); then
      echo -e "\n${RED}[FAIL] Frontend Live Tests Failed!${NC}"
      exit 1
    fi
    echo -e "${GREEN}[PASS] Frontend live tests passed.${NC}"

    echo -e "\n${GREEN}[SUCCESS] ALL UNIT & STRICT LIVE TESTS PASSED! System 100% verified.${NC}"
  fi
fi

# ====================================================================
# [GATE 4] K6 Performance Test Suite
# ====================================================================
if [ "$PERF" = true ]; then
  echo -e "\n${MAGENTA}========================================================${NC}"
  echo -e "${MAGENTA} [Gate 4] Running K6 Performance Tests                  ${NC}"
  echo -e "${MAGENTA}========================================================${NC}"

  ALL_SUITES=("smoke" "load" "stress" "spike" "soak")
  TARGET_SUITES=()

  CLEAN_SUITE=$(echo "$PERF_SUITE" | tr '[:upper:]' '[:lower:]')

  if [ -z "$CLEAN_SUITE" ] || [ "$CLEAN_SUITE" = "all" ]; then
    TARGET_SUITES=("${ALL_SUITES[@]}")
  else
    VALID=false
    for s in "${ALL_SUITES[@]}"; do
      if [ "$s" = "$CLEAN_SUITE" ]; then
        VALID=true
        break
      fi
    done
    if [ "$VALID" = false ]; then
      echo -e "\n${RED}[FAIL] Invalid perf suite '$PERF_SUITE'. Available suites: ${ALL_SUITES[*]}${NC}"
      exit 1
    fi
    TARGET_SUITES=("$CLEAN_SUITE")
  fi

  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  ANY_PERF_FAILED=false
  PERF_RESULTS=()
  export K6_TIMEOUT="30s"

  for suite in "${TARGET_SUITES[@]}"; do
    suite_rel_path="k6/suites/${suite}.js"
    suite_path="$SCRIPT_DIR/$suite_rel_path"
    if [ ! -f "$suite_path" ]; then
      echo -e "\n${RED}[FAIL] Test suite file not found: $suite_path${NC}"
      exit 1
    fi

    echo -e "\n${YELLOW}> Running K6 Performance Suite: $suite ($suite_rel_path)...${NC}"
    start_time=$(date +%s)
    if (cd "$SCRIPT_DIR" && "$K6_CMD" run "$suite_rel_path"); then
      end_time=$(date +%s)
      duration=$((end_time - start_time))
      echo -e "${GREEN}[PASS] K6 Suite '$suite' Passed in ${duration}s.${NC}"
      PERF_RESULTS+=("$suite:PASSED:${duration}")
    else
      end_time=$(date +%s)
      duration=$((end_time - start_time))
      echo -e "${RED}[FAIL] K6 Suite '$suite' Failed in ${duration}s!${NC}"
      PERF_RESULTS+=("$suite:FAILED:${duration}")
      ANY_PERF_FAILED=true
    fi
  done

  echo -e "\n${MAGENTA}========================================================${NC}"
  echo -e "${MAGENTA}              PERFORMANCE TEST SUMMARY                 ${NC}"
  echo -e "${MAGENTA}========================================================${NC}"
  printf "%-15s | %-10s | %s\n" "Suite Name" "Status" "Duration"
  echo "----------------+------------+----------"
  for res in "${PERF_RESULTS[@]}"; do
    IFS=":" read -r r_suite r_status r_dur <<< "$res"
    if [ "$r_status" = "PASSED" ]; then
      printf "%-15s | \033[0;32m%-10s\033[0m | %ss\n" "$r_suite" "$r_status" "$r_dur"
    else
      printf "%-15s | \033[0;31m%-10s\033[0m | %ss\n" "$r_suite" "$r_status" "$r_dur"
    fi
  done
  echo -e "${MAGENTA}========================================================${NC}"

  if [ "$ANY_PERF_FAILED" = true ]; then
    echo -e "\n${RED}[FAIL] One or more performance test suites failed!${NC}"
    exit 1
  fi
  echo -e "\n${GREEN}[PASS] All specified performance tests passed!${NC}"
fi
