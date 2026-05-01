#!/usr/bin/env python3
"""
build.py — Generates .mcp.json from .mcp.json.example + .claude/.env
Run from the PID root: python3 .claude/build.py
"""
import json
import re
import sys
from pathlib import Path


def load_env(env_path: Path) -> dict:
    """Parse a .env file into a dict."""
    env = {}
    if not env_path.exists():
        return env
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        if '=' not in line:
            continue
        key, value = line.split('=', 1)
        value = value.strip().strip('"').strip("'")
        env[key.strip()] = value
    return env


def substitute(text: str, env: dict) -> str:
    """Replace ${VAR} placeholders with values from env."""
    def replacer(match):
        var = match.group(1)
        if var in env:
            return env[var]
        print(f'  WARNING: ${{{var}}} not found in .env — left as placeholder')
        return match.group(0)
    return re.sub(r'\$\{(\w+)\}', replacer, text)


def main():
    # Detect paths
    script_dir = Path(__file__).parent  # .claude/
    pid_root = script_dir.parent        # pids/dev/

    env_path = script_dir / '.env'
    example_path = pid_root / '.mcp.json.example'
    output_path = pid_root / '.mcp.json'

    # Check files exist
    if not example_path.exists():
        print(f'ERROR: {example_path} not found')
        sys.exit(1)

    if not env_path.exists():
        print(f'ERROR: {env_path} not found')
        print(f'  Copy .claude/.env.example to .claude/.env and fill in your values')
        sys.exit(1)

    # Load env
    env = load_env(env_path)
    print(f'Loaded {len(env)} variables from {env_path}')

    # Read template
    template = example_path.read_text()

    # Find all variables needed
    needed = set(re.findall(r'\$\{(\w+)\}', template))
    missing = needed - set(env.keys())
    if missing:
        print(f'  Missing variables: {", ".join(sorted(missing))}')
        print(f'  Add them to {env_path}')

    # Substitute
    result = substitute(template, env)

    # Remove _comment fields (they are for humans reading the example)
    try:
        data = json.loads(result)
        for server in data.get('mcpServers', {}).values():
            server.pop('_comment', None)
        result = json.dumps(data, indent=2)
    except json.JSONDecodeError:
        print('WARNING: Result is not valid JSON — variable substitution may be incomplete')

    # Write output
    output_path.write_text(result + '\n')
    print(f'Generated {output_path}')


if __name__ == "__main__":
    main()
