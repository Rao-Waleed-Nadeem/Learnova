# Learnova Docker Auto-Repair Instructions

## Goal

Automatically diagnose and fix the Docker Compose build failure in the Learnova repository on Windows/PowerShell.

Current observed error:

```text
target frontend: failed to solve: failed to read dockerfile: open Dockerfile: no such file or directory
```

The PostgreSQL image was pulled, but the frontend/backend images did not build. `docker compose ps` returned no running containers.

**Primary objective:** inspect the actual repository, repair the Dockerfile paths and missing starter files as needed, and get the intended services building and running without damaging existing project files.

## Safety and operating rules

1. Work from the repository root (`D:\Learnova`, or detect the actual root by locating `docker-compose.yml` and `.git`).
2. Inspect before changing anything. Do not assume the existing file structure matches this document.
3. Do not move, delete, overwrite, or rename project files in bulk.
4. Preserve existing application code, documentation, Git history, and project-specific configuration.
5. If a file already exists, inspect and adapt it instead of blindly replacing it.
6. Never print, commit, or expose `.env` values, API keys, passwords, tokens, or other secrets.
7. Never run `docker compose down -v`, remove Docker volumes, or delete database data.
8. Do not install a new framework or rewrite the frontend to work around a path problem.
9. Make the smallest safe changes needed. Explain every material change and why it is needed.
10. If a destructive or ambiguous change is required, stop and ask for approval.
11. Run commands in PowerShell syntax when working on Windows.
12. Do not claim success unless the relevant commands and health checks actually pass.

## Phase 1 — Inspect the repository

From the repository root, inspect:

```powershell
Get-Location
Get-ChildItem -Force
Get-ChildItem .\frontend -Force -ErrorAction SilentlyContinue
Get-ChildItem .\backend -Force -ErrorAction SilentlyContinue
git status --short
```

Locate the Compose file and all Docker-related files without dumping secret files:

```powershell
Get-ChildItem -Path . -Recurse -File -Include docker-compose.yml,compose.yml,Dockerfile,.dockerignore,package.json,package-lock.json,server.ts,vite.config.ts,requirements.txt,main.py |
  Where-Object { $_.FullName -notmatch '\\(node_modules|\.git|dist|build|\.venv)\\' } |
  Select-Object -ExpandProperty FullName
```

Do **not** recursively print `.env` or secret-file contents.

Determine:
- Where `docker-compose.yml` / `compose.yml` actually resides.
- Whether `frontend/Dockerfile` exists.
- Whether the frontend app is in `frontend/` or still at the repository root.
- Whether `frontend/package.json`, `package-lock.json`, and `server.ts` exist.
- Whether `backend/Dockerfile`, `backend/requirements.txt`, and `backend/app/main.py` exist.
- The exact `build.context` and `build.dockerfile` values for each service in Compose.
- The host/port that the current frontend server actually listens on. Inspect `server.ts` and `vite.config.ts` before changing port configuration.

## Phase 2 — Diagnose the Dockerfile path error

For a Compose service configured like this:

```yaml
build:
  context: ./frontend
  dockerfile: Dockerfile
```

Docker expects the file at `<repository-root>/frontend/Dockerfile`.

For a backend service configured like this:

```yaml
build:
  context: ./backend
  dockerfile: Dockerfile
```

Docker expects the file at `<repository-root>/backend/Dockerfile`.

Repair the mismatch using the safest option:

- If the intended Dockerfile exists in a different location, update Compose to reference that real location relative to the build context, or create/move only the specific Dockerfile after confirming the intended structure.
- If frontend files are still in the repository root, do **not** bulk-move all root files. Identify frontend-specific files explicitly and ask before relocating them if ownership is ambiguous. Prefer making the Compose build context match the existing layout as a temporary fix only if it does not accidentally include secrets or unrelated project files.
- If a Dockerfile is absent, create it only after confirming the corresponding app files and startup command.
- Remember: `dockerfile:` is resolved relative to the build context, not relative to the Compose file.

## Phase 3 — Frontend Docker configuration

The existing frontend `package.json` has these scripts:

```json
{
  "dev": "tsx server.ts",
  "build": "vite build",
  "start": "tsx server.ts",
  "preview": "vite preview",
  "clean": "rm -rf dist server.js",
  "lint": "tsc --noEmit",
  "test": "node --test src/utils/dag.test.ts src/utils/assessment.test.ts src/utils/studentLogic.test.ts src/utils/adminLogic.test.ts"
}
```

The frontend is a React/Vite project with an Express/TypeScript server entry point (`server.ts`). Do not assume that `npm run dev` is equivalent to running Vite directly.

A reasonable Dockerfile **if the frontend is located in `frontend/` and the current app supports it** is:

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

Use `npm ci` instead of `npm install` only if `package-lock.json` exists and is consistent with `package.json`.

Before finalizing the port:
- Inspect `server.ts` to confirm the actual listener port and that it binds to `0.0.0.0` or can be configured to do so.
- Inspect `vite.config.ts` for server settings and middleware integration.
- Align Compose `ports`, Dockerfile `EXPOSE`, and environment variables with the actual listener.
- Do not silently change application runtime behavior just to match a guessed port.

A suitable `frontend/.dockerignore`, if frontend is its own build context, is:

```gitignore
node_modules
dist
coverage
.git
.env
.env.*
!.env.example
*.log
```

## Phase 4 — Backend setup

The planned backend is FastAPI with PostgreSQL, but the real backend may not have been implemented yet.

First inspect the existing backend. Do not replace real backend code with a starter API.

Only if the backend is genuinely absent and the user intends to have a temporary runnable scaffold, create these minimal files:

`backend/requirements.txt`:

```text
fastapi
uvicorn[standard]
```

`backend/app/main.py`:

```python
from fastapi import FastAPI

app = FastAPI(
    title="Learnova API",
    description="Backend API for the Learnova learning platform",
    version="0.1.0",
)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "learnova-api"}
```

`backend/app/__init__.py`: empty file.

A matching `backend/Dockerfile`:

```dockerfile
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

A matching `backend/.dockerignore`:

```gitignore
__pycache__/
*.py[cod]
.venv/
venv/
.env
.env.*
!.env.example
.pytest_cache/
.mypy_cache/
.ruff_cache/
.git
```

Do not create the scaffold if existing backend files use a different valid structure or start command.

## Phase 5 — Compose configuration expectations

The root Compose file should coordinate services. Use the actual project layout and current requirements. A typical future layout includes:

- `frontend`: built from `./frontend`.
- `backend`: built from `./backend`.
- `database`: PostgreSQL with a named persistent volume and health check.
- A named volume for frontend `node_modules` if bind-mounting source for development.

If the backend is not yet ready, it is acceptable to keep it behind a Compose profile such as `backend`, so frontend and database can start without building it. Once backend files exist, test the profile explicitly.

The backend's database host inside Compose is the service name `database`, not `localhost`. PostgreSQL's internal port is `5432`.

For a FastAPI service, the intended database URL can be formed from environment variables, but URL-encode special characters in passwords or avoid embedding the raw password in a URL. Never hardcode real credentials in Compose.

Keep local secrets in root `.env`; commit only `.env.example`. Ensure `.env` is ignored by Git.

Do not add `depends_on` from frontend to database unless the frontend genuinely needs direct database access. In the usual architecture, the backend accesses PostgreSQL and the browser/frontend calls the backend.

## Phase 6 — Validate and build

First validate Compose and inspect the resolved service configuration:

```powershell
docker compose config
```

Do not expose resolved secret values in logs or final messages.

Check all required paths explicitly:

```powershell
Test-Path .\docker-compose.yml
Test-Path .\frontend\Dockerfile
Test-Path .\frontend\package.json
Test-Path .\backend\Dockerfile
Test-Path .\backend\requirements.txt
Test-Path .\backend\app\main.py
```

Adjust checks to the actual file layout and whether the backend is intentionally deferred.

Build the frontend:

```powershell
docker compose build frontend
```

If the backend is ready and is behind the `backend` profile:

```powershell
docker compose --profile backend build backend
```

Start frontend and database first:

```powershell
docker compose up -d
docker compose ps
docker compose logs --tail 100 frontend
docker compose logs --tail 100 database
```

If backend is ready:

```powershell
docker compose --profile backend up --build -d
docker compose ps
docker compose logs --tail 100 backend
```

Check backend health only if the health endpoint exists:

```powershell
Invoke-RestMethod http://localhost:8000/health
```

Check the frontend at the actual configured host port in a browser or with an appropriate HTTP request. Do not assume port `3000` until `server.ts` has been inspected.

If a command fails:
- Read the complete error.
- Identify the root cause.
- Make the smallest corrective change.
- Rerun the relevant validation/build command.
- Do not repeatedly rerun the same failing command without changing or investigating anything.

## Phase 7 — Git and data safety

- Review `git diff` and `git status --short` after edits.
- Do not stage or commit unless explicitly asked.
- Do not overwrite a pre-existing root `.gitignore`; merge rules while preserving existing entries.
- `.gitignore` and `.dockerignore` are different: Git ignore rules do not control Docker build contexts.
- A `.dockerignore` applies to its build context. If Compose uses `context: ./frontend`, the relevant ignore file is `frontend/.dockerignore`.
- Do not add `.env`, credentials, `node_modules`, `.venv`, or generated build outputs to version control.
- Never remove PostgreSQL volumes to fix a build problem.

## Completion report

When finished, report concisely:

1. Root cause of the Dockerfile error.
2. Files created or changed.
3. Actual frontend port and how it was verified.
4. Exact commands run and whether they passed.
5. Services that are currently running.
6. Any remaining blocker or assumption.

Only report the application as working if the build succeeds, containers are running, and the relevant endpoint/browser check succeeds.
