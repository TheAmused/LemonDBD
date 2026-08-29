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

  # [Gate 2b] The backend healthcheck (and --wait above) only proves gunicorn
  # is answering HTTP -- it says nothing about the initial DBD data scrape,
  # which runs in a background thread (see backend/run.py) precisely so it
  # doesn't block startup. On a fresh `down -v` reset that scrape can still
  # be filling the DB when the line above prints, and the live test suite
  # below assumes 50+ real characters already exist -- so wait for that here
  # instead of finding out via a wave of confusing 500s/empty-array failures.
  echo -e "\n${YELLOW}> Waiting for the initial character scrape to finish seeding the DB...${NC}"
  # NOTE: this queries Postgres directly through `docker compose exec` instead
  # of hitting the backend over the published host port -- the HTTP path was
  # found to hang/timeout unpredictably right after a fresh `up --wait` on
  # some Docker Desktop setups (the request never even reached gunicorn's
  # access log), which is a host-networking quirk, not an application bug.
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
    echo -e "${RED}[WARN] Character data still not seeded after 3 minutes -- continuing anyway, but live tests will likely fail. Check 'docker compose logs backend' for scrape errors.${NC}"
  fi

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