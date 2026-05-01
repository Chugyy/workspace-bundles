#!/usr/bin/env python3
"""
agent-delegate — CLI for inter-workspace agent delegation.

Usage (inside a workspace / Docker container):
  python -m app.cli.delegate delegate --to <workspace> --prompt "..." [--wait] [--timeout 300] [--retry 0]
  python -m app.cli.delegate status <session_id>
  python -m app.cli.delegate list

This CLI is intended to be used as a SKILL by Claude agents.
It calls the service layer directly (no HTTP, no auth token needed).

Exit codes:
  0  Success
  1  Agent error
  2  Workspace not found
  124 Timeout
"""

import argparse
import asyncio
import json
import subprocess
import sys
import time

import asyncpg

from config.config import settings


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

async def _get_pool() -> asyncpg.Pool:
    dsn = f"postgresql://{settings.db_user}:{settings.db_password}@{settings.db_host}:{settings.db_port}/{settings.db_name}"
    return await asyncpg.create_pool(dsn, min_size=1, max_size=3)


async def _get_workspace_by_name(pool: asyncpg.Pool, name: str) -> dict | None:
    row = await pool.fetchrow("SELECT * FROM workspaces WHERE name = $1", name)
    return dict(row) if row else None


async def _create_session(pool: asyncpg.Pool, workspace_id: str, initiated_by: str) -> str:
    row = await pool.fetchrow(
        "INSERT INTO agent_sessions (workspace_id, initiated_by) VALUES ($1::uuid, $2) RETURNING id",
        workspace_id, initiated_by,
    )
    return str(row["id"])


async def _update_session_status(pool: asyncpg.Pool, session_id: str, status: str) -> None:
    await pool.execute(
        "UPDATE agent_sessions SET status = $2, updated_at = NOW() WHERE id = $1::uuid",
        session_id, status,
    )


async def _get_session(pool: asyncpg.Pool, session_id: str) -> dict | None:
    row = await pool.fetchrow(
        """
        SELECT s.*, w.name as workspace_name
        FROM agent_sessions s
        LEFT JOIN workspaces w ON w.id = s.workspace_id
        WHERE s.id = $1::uuid
        """,
        session_id,
    )
    return dict(row) if row else None


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

async def cmd_delegate(args: argparse.Namespace) -> int:
    pool = await _get_pool()
    try:
        workspace = await _get_workspace_by_name(pool, args.to)
        if not workspace:
            print(f"ERROR: workspace '{args.to}' not found", file=sys.stderr)
            return 2

        # Determine caller workspace from CWD
        import os
        cwd = os.getcwd()
        caller = cwd.rstrip("/").split("/")[-1] if cwd else "unknown"
        initiated_by = f"agent:{caller}"

        session_id = await _create_session(pool, str(workspace["id"]), initiated_by)
        cwd_target = f"{settings.base_workspaces_path}/{workspace['name']}"

        if not args.wait:
            # Fire and forget
            await _update_session_status(pool, session_id, "active")
            subprocess.Popen(
                ["claude", "--print", "--cwd", cwd_target, args.prompt],
                env={**__import__("os").environ, "CLAUDE_CODE_OAUTH_TOKEN": settings.claude_code_oauth_token},
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            print(session_id)
            return 0

        # Blocking mode — run and wait
        await _update_session_status(pool, session_id, "active")
        start = time.time()

        for attempt in range(args.retry + 1):
            if attempt > 0:
                print(f"[retry {attempt}/{args.retry}]", file=sys.stderr)

            try:
                result = subprocess.run(
                    ["claude", "--print", "--cwd", cwd_target, args.prompt],
                    capture_output=True,
                    text=True,
                    timeout=args.timeout,
                    env={**__import__("os").environ, "CLAUDE_CODE_OAUTH_TOKEN": settings.claude_code_oauth_token},
                )

                if result.returncode == 0:
                    await _update_session_status(pool, session_id, "completed")
                    print(result.stdout, end="")
                    return 0
                else:
                    if attempt == args.retry:
                        msg = result.stderr or "Agent exited with error"
                        await _update_session_status(pool, session_id, "error")
                        if args.on_failure == "message":
                            print(f"DELEGATION_ERROR: {msg}")
                            return 0
                        print(f"ERROR: {msg}", file=sys.stderr)
                        return 1

            except subprocess.TimeoutExpired:
                elapsed = int(time.time() - start)
                await _update_session_status(pool, session_id, "timeout")
                msg = f"Timeout after {elapsed}s delegating to '{args.to}'"
                if args.on_failure == "message":
                    print(f"DELEGATION_TIMEOUT: {msg}")
                    return 0
                print(f"TIMEOUT: {msg}", file=sys.stderr)
                return 124

        return 1
    finally:
        await pool.close()


async def cmd_status(args: argparse.Namespace) -> int:
    pool = await _get_pool()
    try:
        session = await _get_session(pool, args.session_id)
        if not session:
            print(f"ERROR: session '{args.session_id}' not found", file=sys.stderr)
            return 2
        print(json.dumps({
            "id": str(session["id"]),
            "status": session["status"],
            "workspace": session.get("workspace_name"),
            "initiated_by": session.get("initiated_by", "human"),
            "created_at": str(session["created_at"]),
        }, indent=2))
        return 0
    finally:
        await pool.close()


async def cmd_list(args: argparse.Namespace) -> int:
    pool = await _get_pool()
    try:
        rows = await pool.fetch("SELECT id, name FROM workspaces ORDER BY name ASC")
        for row in rows:
            print(f"{row['name']}  ({row['id']})")
        return 0
    finally:
        await pool.close()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(prog="agent-delegate", description="Inter-workspace agent delegation CLI")
    subparsers = parser.add_subparsers(dest="command")

    # delegate
    p_delegate = subparsers.add_parser("delegate", help="Delegate a task to another workspace")
    p_delegate.add_argument("--to", required=True, help="Target workspace name")
    p_delegate.add_argument("--prompt", required=True, help="Prompt to send to the agent")
    p_delegate.add_argument("--wait", action="store_true", help="Block until the agent responds")
    p_delegate.add_argument("--timeout", type=int, default=300, help="Timeout in seconds (default: 300)")
    p_delegate.add_argument("--retry", type=int, default=0, help="Number of retries on failure (default: 0)")
    p_delegate.add_argument("--on-failure", choices=["error", "message"], default="error",
                            help="On failure: 'error' exits with code 1, 'message' prints an error string to stdout")

    # status
    p_status = subparsers.add_parser("status", help="Check the status of a delegated session")
    p_status.add_argument("session_id", help="Session UUID")

    # list
    subparsers.add_parser("list", help="List available workspaces")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    handlers = {
        "delegate": cmd_delegate,
        "status": cmd_status,
        "list": cmd_list,
    }

    exit_code = asyncio.run(handlers[args.command](args))
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
