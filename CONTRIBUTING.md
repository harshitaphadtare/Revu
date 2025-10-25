# Contributing to Revu

Thanks for your interest in contributing! This guide helps you set up your environment, follow our conventions, and submit a great PR.

## Table of contents

- Getting started
- Development workflow
- Branching & commits
- Testing & verification
- Code style & linting
- Submitting a pull request

## Getting started

1. Fork the repo and clone your fork

2. Prereqs

- Node 18+ and npm
- Python 3.10+
- Docker & docker-compose (recommended for end-to-end)

3. Setup

- Frontend
  ```
  cd frontend
  npm install
  npm run dev
  ```
- Backend (venv)
  ```
  cd backend
  python -m venv ..\.venv
  ..\.venv\Scripts\activate
  pip install -r requirements.txt
  ```
- Redis & Mongo
  - Redis (Docker): `docker run -d -p 6379:6379 --name revu-redis redis:7-alpine`
  - Mongo: Atlas connection string in env `MONGO_URI`

4. Environment variables

- Copy `.env.example` to `.env` at repo root for Docker Compose
- Copy `backend/.env.example` to `backend/.env` if you prefer running backend manually

## Development workflow

- Prefer running everything via `docker-compose up --build` for an end-to-end flow
- Alternatively, run backend locally (Uvicorn) and worker via Celery with Redis, and run the frontend via Vite dev server
- Use the FastAPI docs at `http://localhost:8000/docs` to exercise endpoints
- Import `backend/postman_collections/revu-auth.postman_collection.json` to Postman for auth tests

## Branching & commits

- Branch naming: `feat/<short-description>`, `fix/<issue-or-bug>`, `docs/<area>`, `chore/<what>`
- Commit style: Prefer Conventional Commits (e.g., `feat(auth): add signup endpoint`)
- Keep commits small, clear, and logically scoped

## Testing & verification

- Backend tests (Windows):
  ```
  # from repo root
  run_tests_py.bat
  # or PowerShell
  ./run_tests_pwsh.ps1
  ```
- Frontend build:
  ```
  cd frontend
  npm run build
  ```
- If you add new backend routes/services, include minimal tests under `backend/tests/`

## Code style & linting

- Python: follow PEP8; if you use formatters (black, ruff), run them before pushing
- TypeScript/React: keep code modular and typed; prefer functional components

## Submitting a pull request

1. Ensure your branch is up to date with `main`
2. Fill in a clear PR description (what/why/how), link issues if applicable
3. Add steps to manually verify the change (or tests)
4. Ensure docs are updated (README or inline comments)

Thanks again for contributing — we’re excited to work with you!
