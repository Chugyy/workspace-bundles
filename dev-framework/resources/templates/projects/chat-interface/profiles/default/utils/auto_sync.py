#!/usr/bin/env python3
"""
Auto-sync system for .claude-personal
Agent calls this after making modifications to sync with VPS
"""
import subprocess
import os
from pathlib import Path
from datetime import datetime
from typing import List, Optional

# Auto-detect if we're on Mac or VPS
CLAUDE_DIR = Path(__file__).parent.parent.absolute()
HOSTNAME = subprocess.run(["hostname"], capture_output=True, text=True).stdout.strip()
IS_VPS = "vps" in HOSTNAME.lower() or os.path.exists("/root/repos")

# Remote configuration
if IS_VPS:
    REMOTE_NAME = "origin"  # VPS pushes to origin (bare repo)
else:
    REMOTE_NAME = "vps"  # Mac pushes to vps


def git_auto_sync(message: str = None, files: Optional[List[str]] = None) -> bool:
    """
    Auto-commit and push modifications

    Args:
        message: Commit message (auto-generated if None)
        files: Specific files to commit (None = all)

    Returns:
        True if sync successful, False otherwise
    """
    os.chdir(CLAUDE_DIR)

    try:
        # Pull first (in case of remote changes)
        pull_result = subprocess.run(
            ["git", "pull", REMOTE_NAME, "main"],
            capture_output=True,
            text=True
        )

        # Check for conflicts
        if "CONFLICT" in pull_result.stdout or pull_result.returncode != 0:
            print(f"⚠️  Pull conflict detected. Please resolve manually.")
            return False

        # Add files
        if files:
            for f in files:
                subprocess.run(["git", "add", f], check=True)
        else:
            subprocess.run(["git", "add", "."], check=True)

        # Check if there are changes
        result = subprocess.run(
            ["git", "diff", "--cached", "--quiet"],
            capture_output=True
        )

        if result.returncode != 0:  # Changes detected
            # Auto-generate message if absent
            if not message:
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                location = "VPS" if IS_VPS else "Mac"
                message = f"Auto-sync from {location}: {timestamp}"

            # Commit
            subprocess.run(
                ["git", "commit", "-m", f"[Agent] {message}"],
                check=True,
                capture_output=True
            )

            # Push
            push_result = subprocess.run(
                ["git", "push", REMOTE_NAME, "main"],
                capture_output=True,
                text=True
            )

            if push_result.returncode != 0:
                print(f"❌ Push failed: {push_result.stderr}")
                return False

            print(f"✅ Auto-synced: {message}")
            return True
        else:
            # No changes
            return False

    except subprocess.CalledProcessError as e:
        print(f"❌ Auto-sync error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


def sync_index(message: str = None) -> bool:
    """Sync index/ directory (long-term memory)"""
    return git_auto_sync(
        message=message or "Update index (memory)",
        files=["index/"]
    )


def sync_skills(message: str = None) -> bool:
    """Sync skills/ directory"""
    return git_auto_sync(
        message=message or "Update skills",
        files=["skills/"]
    )


def sync_instructions(message: str = None) -> bool:
    """Sync CLAUDE.md (agent instructions)"""
    return git_auto_sync(
        message=message or "Update agent instructions",
        files=["CLAUDE.md"]
    )


def sync_all(message: str = None) -> bool:
    """Sync everything"""
    return git_auto_sync(message=message)


def get_sync_status() -> dict:
    """Get current sync status"""
    os.chdir(CLAUDE_DIR)

    try:
        # Get current branch
        branch = subprocess.run(
            ["git", "branch", "--show-current"],
            capture_output=True,
            text=True
        ).stdout.strip()

        # Check if up to date with remote
        subprocess.run(["git", "fetch", REMOTE_NAME], capture_output=True)

        local = subprocess.run(
            ["git", "rev-parse", "@"],
            capture_output=True,
            text=True
        ).stdout.strip()

        remote = subprocess.run(
            ["git", "rev-parse", f"{REMOTE_NAME}/main"],
            capture_output=True,
            text=True
        ).stdout.strip()

        # Get uncommitted changes
        status = subprocess.run(
            ["git", "status", "--short"],
            capture_output=True,
            text=True
        ).stdout.strip()

        return {
            "branch": branch,
            "location": "VPS" if IS_VPS else "Mac",
            "up_to_date": local == remote,
            "uncommitted_changes": bool(status),
            "changes": status.split("\n") if status else []
        }
    except Exception as e:
        return {"error": str(e)}


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        action = sys.argv[1]
        msg = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else None

        if action == "status":
            status = get_sync_status()
            print(f"\n📍 Location: {status.get('location')}")
            print(f"🌿 Branch: {status.get('branch')}")
            print(f"🔄 Up to date: {'✅' if status.get('up_to_date') else '❌'}")
            print(f"📝 Uncommitted: {'Yes' if status.get('uncommitted_changes') else 'No'}")
            if status.get('changes'):
                print("\nChanges:")
                for change in status['changes']:
                    print(f"  {change}")

        elif action == "index":
            sync_index(msg)
        elif action == "skills":
            sync_skills(msg)
        elif action == "instructions":
            sync_instructions(msg)
        elif action == "all":
            sync_all(msg)
        else:
            print("Usage: auto_sync.py [status|index|skills|instructions|all] [message]")
    else:
        # Default: sync all
        sync_all()
