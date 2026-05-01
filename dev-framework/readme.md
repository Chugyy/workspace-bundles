# PID: Development

Full-stack development workspace. Builds applications from intent to deployment using 15 specialized agents and 12 skills.

## Stack

- **Backend**: FastAPI + PostgreSQL (asyncpg) + Pydantic v2
- **Frontend**: Next.js + shadcn/ui + Tailwind + React Hook Form + Zod
- **Deploy**: Docker + GitHub Actions + Dokploy

## Setup

### 1. Credentials

Copy the example env and fill in your values:

```bash
cp .claude/.env.example .claude/.env
```

Required variables:

| Variable | Where to get it | Required? |
|----------|----------------|-----------|
| `ANTHROPIC_API_KEY` | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) | Yes |
| `GHCR_USERNAME` | Your GitHub username | For /deploy |
| `GHCR_PAT` | [github.com/settings/tokens](https://github.com/settings/tokens) → scopes: `write:packages` | For /deploy |
| `DOKPLOY_API_KEY` | [app.dokploy.com](https://app.dokploy.com) → Settings → API | For /deploy |
| `HOSTINGER_API_KEY` | [hpanel.hostinger.com](https://hpanel.hostinger.com) → Account → API | For DNS |
| `SSH_VPS_HOST` | Your server IP | For SSH MCP |
| `SSH_VPS_USERNAME` | Your server username | For SSH MCP |
| `SSH_VPS_KEY_PATH` | Path to your SSH private key | For SSH MCP |

### 2. Build config

Generate `.mcp.json` from your credentials:

```bash
python3 .claude/build.py
```

This reads `.claude/.env` and substitutes variables into `.mcp.json.example` → `.mcp.json`.

### 3. Start

```bash
claude
```

## Skills available

| Skill | What it does |
|-------|-------------|
| `/prd` | Brainstorming + product requirements document |
| `/research` | Explore an external service/technology |
| `/jobs` | Define entities, business logic, interactions |
| `/schema` | Design PostgreSQL database schema |
| `/api` | Design REST API endpoints |
| `/frontend` | Frontend architecture (branding, layout, pages, components) |
| `/build` | Generate code layer by layer |
| `/deploy` | Deploy to production (Docker, GitHub, Dokploy, DNS) |
| `/playbook` | Actionable guide on any subject |

## Typical chains

```
SaaS app:     /prd → /research → /jobs → /schema → /api → /frontend → /build → /deploy
Bot:          /prd → /research → /jobs → /schema → /build → /deploy
Landing page: /prd → /frontend → /build → /deploy
API only:     /prd → /jobs → /schema → /api → /build → /deploy
```

## Project structure

Each project lives in its own subfolder:

```
./my-project/
├── docs/                    # Requirements + architecture
│   ├── prd.md
│   └── architecture/
│       ├── entities.md
│       ├── schema.md
│       ├── api/
│       └── configs/         # JSON configs for build agents
└── dev/
    ├── backend/             # FastAPI
    └── frontend/            # Next.js
```
