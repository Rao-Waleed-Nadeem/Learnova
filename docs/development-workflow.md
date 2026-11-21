# Learnova Development Workflow & Operations Runbook

This guide contains verified commands, environment requirements, setup instructions, and execution workflows for local development, testing, and container deployment.

---

## 1. System Requirements & Prerequisites

- **Operating System:** Windows, macOS, or Linux.
- **Python:** Python 3.12 or 3.13 (64-bit).
- **Node.js:** Node.js 20+ or 22+ (LTS).
- **Database:** PostgreSQL 17 (or local SQLite for unit testing).
- **Docker & Docker Compose:** Optional for containerized deployment.

---

## 2. Environment Configuration

### Root `.env` Setup
Create or verify `.env` in the repository root based on `.env.example`:
```ini
# Database Configuration
POSTGRES_USER=learnova
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=learnova
POSTGRES_PORT=5432
DATABASE_URL=postgresql://learnova:your_secure_password@127.0.0.1:5432/learnova

# Backend Configuration
SECRET_KEY=your-super-secret-hex-key-minimum-32-chars
ENVIRONMENT=development
DEBUG=True
HOST=127.0.0.1
PORT=8000
API_V1_STR=/api/v1
CORS_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000"]

# Outbox Processor Configuration (Option B)
OUTBOX_ENABLED=True
OUTBOX_POLL_INTERVAL_SECONDS=5.0
OUTBOX_BATCH_SIZE=20
OUTBOX_MAX_ATTEMPTS=5

# AI Integration
GEMINI_API_KEY=your-google-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
```

---

## 3. Local Execution Runbook

### Option A: Running Services Locally on the Host

#### Step 1: Start Backend (FastAPI on Port 8000)
```powershell
# In terminal 1 (from repository root)
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
- Liveness Probe: `http://localhost:8000/health`
- Readiness Probe: `http://localhost:8000/ready`
- Interactive Swagger UI: `http://localhost:8000/docs`

#### Step 2: Start Frontend (Express + Vite on Port 3000)
```powershell
# In terminal 2 (from repository root)
npm run dev

# Or from frontend directory
cd frontend
npm run dev
```
- Open browser at `http://localhost:3000`.

---

### Option B: Running with Docker Compose

To spin up the complete containerized stack (PostgreSQL 17, FastAPI, and Frontend):
```powershell
docker compose up --build
```
- Stop services: `docker compose down`
- Stop and clear volumes: `docker compose down -v`

---

## 4. Database Schema Migrations (Alembic)

All migration commands must be run from `backend/`:
```powershell
# Navigate to backend directory
cd backend

# Apply all migrations to latest revision
alembic upgrade head

# Inspect current database revision
alembic current

# Roll back the most recent migration
alembic downgrade -1
```

---

## 5. Verification & Testing Commands

### Backend Test Suites (Pytest):
```powershell
# Run full backend test suite
python -m pytest backend/tests

# Run single test module
python -m pytest backend/tests/test_question_bank.py

# Run with verbose output and test names
python -m pytest backend/tests/test_ai_candidate_governance.py -v
```

### Frontend Test Suites (Node & TSX Runners):
```powershell
# Run all frontend tests
npm test

# Run focused DAG cycle test
node --experimental-strip-types --test frontend/src/utils/dag.test.ts

# Run E2E user workflow tests
npm run test:e2e

# Run UI rendering test suite
npm run test:ui

# Verify TypeScript type correctness
npm --prefix frontend run lint

# Verify production Vite build
npm --prefix frontend run build
```

---

## 6. Standalone Public Showcase Pages (`learnova-public-pages/`)

To develop or build the standalone marketing landing page with the 3D Holographic Particle Brain:
```powershell
cd learnova-public-pages
npm install
npm run dev     # Starts local preview
npm run build   # Compiles static bundle to dist/
```
