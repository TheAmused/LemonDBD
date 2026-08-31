# run_tests.py
"""
Master Test Runner for LemonDBD (Full Stack Test Orchestrator)
Executes unit, live, and end-to-end multi-step workflow test suites across
both Python Flask Backend (Pytest) and Next.js / TypeScript Frontend (tsx/node:test).

Usage:
  py run_tests.py                 # Runs all test suites (Backend + Frontend)
  py run_tests.py --unit          # Runs isolated unit & mock test suites
  py run_tests.py --live          # Runs live database & API integration suites
  py run_tests.py --workflows     # Runs end-to-end multi-step workflow suites
  py run_tests.py --backend       # Runs backend suites only
  py run_tests.py --frontend      # Runs frontend suites only
"""

import argparse
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import List, Dict, Any, Optional

# ANSI Color codes
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"


def run_command(cmd_str: str, cwd: Path, env: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    merged_env = {**os.environ, **(env or {})}
    start_time = time.time()
    try:
        proc = subprocess.run(
            cmd_str,
            cwd=str(cwd),
            env=merged_env,
            shell=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            stdin=subprocess.DEVNULL,
            timeout=120,
        )
        duration = round(time.time() - start_time, 2)
        return {
            "exit_code": proc.returncode,
            "stdout": proc.stdout,
            "stderr": proc.stderr,
            "duration": duration,
        }
    except subprocess.TimeoutExpired as te:
        return {
            "exit_code": 124,
            "stdout": te.stdout or "",
            "stderr": "Execution timed out (120s limit).",
            "duration": 120.0,
        }
    except Exception as e:
        return {
            "exit_code": 1,
            "stdout": "",
            "stderr": str(e),
            "duration": round(time.time() - start_time, 2),
        }


def main():
    parser = argparse.ArgumentParser(description="LemonDBD Full-Stack Test Suite Runner")
    parser.add_argument("--unit", action="store_true", help="Run unit test suites only")
    parser.add_argument("--live", action="store_true", help="Run live integration test suites only")
    parser.add_argument("--workflows", action="store_true", help="Run workflow test suites only")
    parser.add_argument("--backend", action="store_true", help="Run backend tests only")
    parser.add_argument("--frontend", action="store_true", help="Run frontend tests only")
    parser.add_argument("-v", "--verbose", action="store_true", help="Show full stdout and stderr")
    args = parser.parse_args()

    # Default to running all if no category is specified
    run_all_categories = not (args.unit or args.live or args.workflows)
    run_unit = args.unit or run_all_categories
    run_live = args.live or run_all_categories
    run_workflows = args.workflows or run_all_categories

    run_backend = not args.frontend or args.backend
    run_frontend = not args.backend or args.frontend

    print(f"\n{BOLD}{CYAN}======================================================{RESET}", flush=True)
    print(f"{BOLD}{CYAN}       LemonDBD Master Test Suite Orchestrator        {RESET}", flush=True)
    print(f"{BOLD}{CYAN}======================================================{RESET}\n", flush=True)

    results = []

    # 1. Backend Unit Tests
    if run_backend and run_unit:
        print(f"[{YELLOW}RUNNING{RESET}] Backend Unit Tests (SQLite in-memory)...", flush=True)
        res = run_command("py -m pytest tests/unit -q", cwd=BACKEND_DIR)
        status = "PASSED" if res["exit_code"] == 0 else "FAILED"
        color = GREEN if status == "PASSED" else RED
        print(f"[{color}{status}{RESET}] Backend Unit Tests in {res['duration']}s", flush=True)
        results.append({
            "name": "Backend Unit & Scrapers",
            "tier": "Unit (SQLite Memory)",
            "status": status,
            "duration": res["duration"],
            "output": res["stdout"] or res["stderr"],
        })

    # 2. Backend Live API & Services
    if run_backend and run_live:
        print(f"[{YELLOW}RUNNING{RESET}] Backend Live API & Service Integration (PostgreSQL Clone)...", flush=True)
        res = run_command(
            "py -m pytest tests/live/api tests/live/services tests/live/test_live_smoke.py -q",
            cwd=BACKEND_DIR,
        )
        status = "PASSED" if res["exit_code"] == 0 else "FAILED"
        color = GREEN if status == "PASSED" else RED
        print(f"[{color}{status}{RESET}] Backend Live Integration in {res['duration']}s", flush=True)
        results.append({
            "name": "Backend Live API & Services",
            "tier": "Live (PostgreSQL Clone)",
            "status": status,
            "duration": res["duration"],
            "output": res["stdout"] or res["stderr"],
        })

    # 3. Backend End-to-End Workflows
    if run_backend and run_workflows:
        print(f"[{YELLOW}RUNNING{RESET}] Backend Multi-Step End-to-End Workflows...", flush=True)
        res = run_command("py -m pytest tests/live/workflows -q", cwd=BACKEND_DIR)
        status = "PASSED" if res["exit_code"] == 0 else "FAILED"
        color = GREEN if status == "PASSED" else RED
        print(f"[{color}{status}{RESET}] Backend E2E Workflows in {res['duration']}s", flush=True)
        results.append({
            "name": "Backend E2E Workflows",
            "tier": "Live Workflows",
            "status": status,
            "duration": res["duration"],
            "output": res["stdout"] or res["stderr"],
        })

    # 4. Frontend Unit Tests
    if run_frontend and run_unit:
        print(f"[{YELLOW}RUNNING{RESET}] Frontend Unit Tests (Node/TSX)...", flush=True)
        res = run_command("npm run test:unit", cwd=FRONTEND_DIR)
        status = "PASSED" if res["exit_code"] == 0 else "FAILED"
        color = GREEN if status == "PASSED" else RED
        print(f"[{color}{status}{RESET}] Frontend Unit Tests in {res['duration']}s", flush=True)
        results.append({
            "name": "Frontend Unit & Math/Voice",
            "tier": "Unit (Node/TSX)",
            "status": status,
            "duration": res["duration"],
            "output": res["stdout"] or res["stderr"],
        })

    # 5. Frontend Live API & Workflows
    if run_frontend and (run_live or run_workflows):
        print(f"[{YELLOW}RUNNING{RESET}] Frontend Live API & Multi-Step Workflows...", flush=True)
        res = run_command("npm run test:live", cwd=FRONTEND_DIR)
        status = "PASSED" if res["exit_code"] == 0 else "FAILED"
        color = GREEN if status == "PASSED" else RED
        print(f"[{color}{status}{RESET}] Frontend Live Workflows in {res['duration']}s", flush=True)
        results.append({
            "name": "Frontend Live & Workflows",
            "tier": "Live Stack",
            "status": status,
            "duration": res["duration"],
            "output": res["stdout"] or res["stderr"],
        })

    # Final Summary Table
    print(f"\n{BOLD}========================================================================{RESET}", flush=True)
    print(f"{BOLD}                        TEST EXECUTION SUMMARY                          {RESET}", flush=True)
    print(f"{BOLD}========================================================================{RESET}", flush=True)
    print(f"{'Suite Name':<32} | {'Tier':<22} | {'Status':<10} | {'Duration'}", flush=True)
    print(f"{'-'*32}-|-{'-'*22}-|-{'-'*10}-|-{'-'*10}", flush=True)

    all_passed = True
    total_time = 0.0

    for r in results:
        status_colored = f"{GREEN}PASS{RESET}" if r["status"] == "PASSED" else f"{RED}FAIL{RESET}"
        if r["status"] != "PASSED":
            all_passed = False
        total_time += r["duration"]
        print(f"{r['name']:<32} | {r['tier']:<22} | {status_colored:<19} | {r['duration']}s", flush=True)

    print(f"{BOLD}========================================================================{RESET}", flush=True)
    total_status = f"{GREEN}ALL PASSED{RESET}" if all_passed else f"{RED}SOME FAILED{RESET}"
    print(f"{BOLD}Final Verdict: {total_status} (Total Time: {round(total_time, 2)}s){RESET}\n", flush=True)

    if args.verbose or not all_passed:
        for r in results:
            if args.verbose or r["status"] != "PASSED":
                print(f"{BOLD}--- Output for {r['name']} ---{RESET}", flush=True)
                print(r["output"], flush=True)
                print("", flush=True)

    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()