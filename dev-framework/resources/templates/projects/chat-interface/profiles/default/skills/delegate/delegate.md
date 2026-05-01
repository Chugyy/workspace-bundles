# Skill: Agent Delegation

Delegate tasks to other specialized agents (workspaces) and retrieve results.

## When to use

Use this skill when:
- A task requires expertise from a specialized agent (marketing, dev, accounting, etc.)
- You want to run work in parallel across multiple workspaces
- You are an orchestrator agent distributing work

## Commands

### List available workspaces
```bash
python -m app.cli.agent_delegate list
```

### Delegate and WAIT for result (synchronous)
```bash
python -m app.cli.agent_delegate delegate \
  --to <workspace_name> \
  --prompt "<task description>" \
  --wait \
  --timeout 300 \
  --retry 1 \
  --on-failure message
```
Returns: the agent's response on stdout.

### Delegate without waiting (async / fire-and-forget)
```bash
python -m app.cli.agent_delegate delegate \
  --to <workspace_name> \
  --prompt "<task description>"
```
Returns: session UUID on stdout (use `status` to check later).

### Check status of a delegated session
```bash
python -m app.cli.agent_delegate status <session_id>
```
Returns JSON: `{ "id", "status", "workspace", "initiated_by", "created_at" }`

## Exit codes
- `0` — success
- `1` — agent error
- `2` — workspace not found
- `124` — timeout

## Examples

**Orchestrator asking the marketing agent to analyze sales:**
```bash
result=$(python -m app.cli.agent_delegate delegate \
  --to marketing \
  --prompt "Analyze Q1 2026 sales data and summarize key trends" \
  --wait --timeout 600)
echo "$result"
```

**Launching 3 agents in parallel:**
```bash
id1=$(python -m app.cli.agent_delegate delegate --to marketing --prompt "...")
id2=$(python -m app.cli.agent_delegate delegate --to dev --prompt "...")
id3=$(python -m app.cli.agent_delegate delegate --to accounting --prompt "...")
# ... do other work ...
python -m app.cli.agent_delegate status $id1
python -m app.cli.agent_delegate status $id2
python -m app.cli.agent_delegate status $id3
```

## Notes
- Sessions created by this CLI are tagged `initiated_by: agent:<your_workspace_name>`
- They are visible in the web UI with an "agent" badge
- The `--on-failure message` flag returns a readable error string instead of crashing,
  allowing the calling agent to handle failures gracefully
