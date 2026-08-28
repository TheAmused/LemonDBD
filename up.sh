#!/usr/bin/env bash
set -eo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

STRICT=false
DOWN=false

for arg in "$@"; do
  case $arg in
    -s|--strict|-Strict)
      STRICT=true
      shift
      ;;
    -d|--down|-Down)
      DOWN=true
      shift
      ;;
    -h|--help)
      echo "Usage: ./up.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -s, --strict    Fresh build (--no-cache) and runs dual-stack live tests"
      echo "  -d, --down      Stop and tear down Docker containers"
      echo "  -h, --help      Show this help message"
      exit 0
      ;;
    *)
      ;;
  esac
done

# Handle explicit teardown request
if [ "$DOWN" = true ]; then
  echo -e "${YELLOW}[STOP] Tearing down containers...${NC}"
  docker compose down
  exit 0
fi

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
if ! python3 -m pytest backend/tests/unit -v --tb=short; then
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

  if ! python3 -m pytest backend/tests/live -v; then
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