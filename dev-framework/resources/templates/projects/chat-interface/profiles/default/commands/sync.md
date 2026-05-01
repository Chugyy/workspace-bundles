---
description: Synchronize .claude-personal with VPS (interactive pull/push)
---

# Git Synchronization Manager

Execute the sync workflow to manage Git synchronization with VPS.

## Your Task

1. **Check current sync status** using the Python script
2. **Analyze the situation** and determine what actions are needed
3. **Propose actions to the user** using AskUserQuestion tool
4. **Execute the chosen action** based on user response

## Step 1: Check Status

```bash
python3 utils/auto_sync.py status
```

This will show:
- Current location (Mac or VPS)
- Branch
- Sync status (up to date or not)
- Uncommitted changes

## Step 2: Analyze and Propose

Based on the status, use `AskUserQuestion` to propose:

**If there are uncommitted changes:**
- Offer to commit and push them

**If remote has new commits:**
- Offer to pull them

**If both local and remote have changes:**
- Warn about potential conflicts
- Offer to pull first, then push

**If everything is up to date:**
- Inform the user, no action needed

## Step 3: Execute

Based on user choice:

**Pull:**
```bash
git pull vps main
```

**Push (with auto-sync):**
```bash
python3 utils/auto_sync.py all "User requested sync"
```

**Custom commit message:**
```bash
python3 utils/auto_sync.py all "Custom message from user"
```

**Status only:**
Just display the status and exit.

## Important Rules

- **ALWAYS** use `AskUserQuestion` before any git operation
- **NEVER** auto-pull or auto-push without user confirmation
- **ALWAYS** show what will happen before doing it
- **WARN** if there are potential conflicts
- Be **concise** in questions and outputs

## Example Flow

```
User runs: /sync

1. Check status → Uncommitted changes detected
2. Ask user:
   Question: "You have uncommitted changes. What do you want to do?"
   Options:
   - "Commit and push to VPS"
   - "View changes first"
   - "Cancel"

3. If "Commit and push":
   - Ask for commit message
   - Execute auto_sync.py
   - Show result

4. If "View changes":
   - Run git status --short
   - Show files
   - Ask again what to do

5. If "Cancel":
   - Exit
```

## Response Format

Keep responses minimal and structured:

```
📊 Sync Status:
- Location: Mac
- Branch: main
- Status: 2 uncommitted files
- Remote: Up to date

[Ask user what to do]
```

After action:
```
✅ Changes pushed successfully
Commit: c64879e
```

---

**Remember**: User has full control. You propose, user decides.
