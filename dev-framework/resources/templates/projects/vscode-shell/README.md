# Shell — SSH Web IDE

A browser-based SSH terminal and file explorer that connects to a remote server via SSH/SFTP.

## Quick start

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your values
docker compose up --build
```

Frontend: http://localhost:3100  
Backend API: http://localhost:3101

## Environment variables

All config lives in `backend/.env`. Key variables:

| Variable | Description |
|---|---|
| `AUTH_PASSWORD` | Login password for the web UI |
| `SESSION_SECRET` | Random 32+ char string for session signing |
| `SSH_HOST` | SSH target host (`host.docker.internal` for the VPS itself) |
| `SSH_USERNAME` | SSH user |
| `SSH_PRIVATE_KEY_PATH` | Path to private key inside the container (default: `/root/.ssh/id_rsa`) |
| `SFTP_ROOT_PATH` | Root directory exposed in the file explorer |
| `CORS_ORIGIN` | Public URL of the frontend |

## Architecture

- **Frontend** (Next.js 15, port 3100): UI with xterm.js terminal and file tree.
- **Backend** (Fastify + ssh2, port 3101): proxies terminal I/O over WebSocket and file operations over SFTP.
- SSH keys are mounted read-only from `~/.ssh` on the host into the backend container.
