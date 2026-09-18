#!/usr/bin/env python3
"""
Squad Subagents MCP Server
Exposes invoke_subagent, invoke_subagents_parallel, and list_squad_agents tools
via the Model Context Protocol (FastMCP) for direct invocation by Antigravity agents.
"""

from mcp.server.fastmcp import FastMCP
import subprocess
import os
import concurrent.futures
import time

SQUAD_DIR = "/home/krikan/productivity/deeplensSquad"
AGY_BIN = "/home/krikan/.local/bin/agy"

mcp = FastMCP("squad_subagents")

@mcp.tool()
def list_squad_agents() -> list[str]:
    """List all available specialist squad subagent identifiers."""
    agents_dir = os.path.join(SQUAD_DIR, ".gemini", "agents")
    if os.path.isdir(agents_dir):
        return sorted([
            f[:-3] for f in os.listdir(agents_dir) 
            if f.endswith(".md") and f != "squad.md"
        ])
    return []

def _invoke(agent_name: str, prompt: str, timeout_seconds: int = 120) -> str:
    start_time = time.time()
    cmd = [
        AGY_BIN,
        "--add-dir", SQUAD_DIR,
        "--agent", agent_name,
        "--dangerously-skip-permissions",
        "--print", prompt,
        "--print-timeout", f"{timeout_seconds}s"
    ]
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout_seconds + 10,
            cwd=SQUAD_DIR
        )
        duration = round(time.time() - start_time, 2)
        if proc.returncode == 0:
            return f"### Response from {agent_name} ({duration}s)\n\n{proc.stdout.strip()}"
        else:
            err = proc.stderr.strip() or f"Process exited with code {proc.returncode}"
            return f"### Error from {agent_name} ({duration}s)\n\n{err}\n\n{proc.stdout.strip()}"
    except subprocess.TimeoutExpired:
        return f"### Error from {agent_name}\n\nTimed out after {timeout_seconds}s."
    except Exception as ex:
        return f"### Exception invoking {agent_name}\n\n{str(ex)}"

@mcp.tool()
def invoke_subagent(agent_name: str, prompt: str, timeout_seconds: int = 120) -> str:
    """
    Invoke a specialist squad subagent (e.g. bhishma-architect, nakula-debugger, viswakarma-design,
    abhimanyu-testing, naga-sql-data, scribe, etc.) to perform domain tasks autonomously.
    """
    return _invoke(agent_name, prompt, timeout_seconds)

@mcp.tool()
def invoke_subagents_parallel(invocations: list[dict], timeout_seconds: int = 120) -> str:
    """
    Invoke multiple specialist squad subagents concurrently in parallel and aggregate their results.
    Each item in 'invocations' must have 'agent_name' and 'prompt' keys.
    """
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(invocations)) as executor:
        futures = {
            executor.submit(_invoke, inv["agent_name"], inv["prompt"], timeout_seconds): inv["agent_name"]
            for inv in invocations
        }
        for future in concurrent.futures.as_completed(futures):
            results.append(future.result())
    return "\n\n---\n\n".join(results)

if __name__ == "__main__":
    mcp.run()
