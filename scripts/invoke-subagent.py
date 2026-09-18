#!/usr/bin/env python3
"""
Squad Subagent Invocation Bridge for AGY CLI
Enables Krishna (Lead Coordinator) and other agents to invoke specialist squad subagents
synchronously or in parallel with full autonomy, capturing their output, handling timeouts, and formatting responses.

Usage:
  python3 scripts/invoke-subagent.py --agent <agent-id> --task "<prompt>"
  python3 scripts/invoke-subagent.py --list
  python3 scripts/invoke-subagent.py --parallel --agents "bhishma-architect,nakula-debugger" --tasks "Review X;;;Investigate Y"
"""

import argparse
import concurrent.futures
import json
import os
import subprocess
import sys
import time

SQUAD_DIR = "/home/krikan/productivity/deeplensSquad"
AGY_BIN = "/home/krikan/.local/bin/agy"

def get_available_agents():
    """Retrieve list of agents available in deeplensSquad."""
    agents_dir = os.path.join(SQUAD_DIR, ".gemini", "agents")
    if os.path.isdir(agents_dir):
        return sorted([
            f[:-3] for f in os.listdir(agents_dir) 
            if f.endswith(".md") and f != "squad.md"
        ])
    return []

def invoke_single_agent(agent_name: str, task: str, timeout: int = 120):
    """Invoke a single subagent via agy CLI and return result dict."""
    start_time = time.time()
    cmd = [
        AGY_BIN,
        "--add-dir", SQUAD_DIR,
        "--agent", agent_name,
        "--dangerously-skip-permissions",
        "--print", task,
        "--print-timeout", f"{timeout}s"
    ]
    
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout + 10,
            cwd=SQUAD_DIR
        )
        duration = time.time() - start_time
        if proc.returncode == 0:
            return {
                "agent": agent_name,
                "status": "success",
                "duration_seconds": round(duration, 2),
                "output": proc.stdout.strip(),
                "error": None
            }
        else:
            return {
                "agent": agent_name,
                "status": "error",
                "duration_seconds": round(duration, 2),
                "output": proc.stdout.strip(),
                "error": proc.stderr.strip() or f"Exited with code {proc.returncode}"
            }
    except subprocess.TimeoutExpired:
        duration = time.time() - start_time
        return {
            "agent": agent_name,
            "status": "timeout",
            "duration_seconds": round(duration, 2),
            "output": "",
            "error": f"Subagent timed out after {timeout} seconds"
        }
    except Exception as ex:
        duration = time.time() - start_time
        return {
            "agent": agent_name,
            "status": "exception",
            "duration_seconds": round(duration, 2),
            "output": "",
            "error": str(ex)
        }

def invoke_parallel(agent_tasks: list, timeout: int = 120):
    """Invoke multiple subagents concurrently."""
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(agent_tasks)) as executor:
        future_to_agent = {
            executor.submit(invoke_single_agent, at["agent"], at["task"], timeout): at["agent"]
            for at in agent_tasks
        }
        for future in concurrent.futures.as_completed(future_to_agent):
            agent = future_to_agent[future]
            try:
                res = future.result()
                results.append(res)
            except Exception as exc:
                results.append({
                    "agent": agent,
                    "status": "exception",
                    "duration_seconds": 0,
                    "output": "",
                    "error": str(exc)
                })
    return results

def main():
    parser = argparse.ArgumentParser(description="Squad Subagent Invocation Bridge")
    parser.add_argument("--agent", help="Single subagent identifier to invoke")
    parser.add_argument("--task", help="Task prompt for the subagent")
    parser.add_argument("--timeout", type=int, default=120, help="Timeout in seconds")
    parser.add_argument("--list", action="store_true", help="List available squad subagents")
    parser.add_argument("--parallel", action="store_true", help="Run parallel subagent invocations")
    parser.add_argument("--agents", help="Comma-separated subagents for parallel execution")
    parser.add_argument("--tasks", help="Tasks separated by ';;;' for parallel execution")
    parser.add_argument("--json", action="store_true", help="Output results in raw JSON format")

    args = parser.parse_args()

    if args.list:
        agents = get_available_agents()
        if args.json:
            print(json.dumps(agents, indent=2))
        else:
            print("Available Squad Subagents:")
            for a in agents:
                print(f"  - {a}")
        return

    if args.parallel:
        if not args.agents or not args.tasks:
            print("Error: --parallel requires --agents and --tasks", file=sys.stderr)
            sys.exit(1)
        agents = [a.strip() for a in args.agents.split(",") if a.strip()]
        tasks = [t.strip() for t in args.tasks.split(";;;") if t.strip()]
        if len(agents) != len(tasks):
            print(f"Error: Number of agents ({len(agents)}) != number of tasks ({len(tasks)})", file=sys.stderr)
            sys.exit(1)
        
        agent_tasks = [{"agent": a, "task": t} for a, t in zip(agents, tasks)]
        results = invoke_parallel(agent_tasks, timeout=args.timeout)
        
        if args.json:
            print(json.dumps(results, indent=2))
        else:
            for r in results:
                print(f"\n{'='*20} [{r['agent']}] (Status: {r['status']}, {r['duration_seconds']}s) {'='*20}")
                if r['output']:
                    print(r['output'])
                if r['error']:
                    print(f"ERROR: {r['error']}", file=sys.stderr)
        return

    if args.agent and args.task:
        res = invoke_single_agent(args.agent, args.task, timeout=args.timeout)
        if args.json:
            print(json.dumps(res, indent=2))
        else:
            if res['status'] == 'success':
                print(res['output'])
            else:
                print(f"Error ({res['status']}): {res['error']}", file=sys.stderr)
                if res['output']:
                    print(res['output'])
                sys.exit(1)
        return

    parser.print_help()

if __name__ == "__main__":
    main()
