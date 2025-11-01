# Contributing to Revu

Thank you for your interest in contributing to Revu — we appreciate your time and help.

This document is the single, authoritative contribution guide. It standardizes environment requirements, development setup, branch naming, testing, and PR expectations.

## Table of contents

- Reporting bugs & feature requests
- Prerequisites
- Quick development setup (local and Docker)
- Running tests & linters
- Branching, commits & PR workflow
- PR checklist
- Communication & support
- Code of Conduct

---

## Reporting bugs & feature requests

- File issues on GitHub. For bugs include: steps to reproduce, expected vs actual behavior, environment (OS, Python/Node/npm versions), and relevant logs or error messages.
- For feature requests, open an issue describing the problem, proposed solution, and any UX/API sketches where helpful.

## Prerequisites

- Node.js 18+ and npm (frontend)
- Python 3.11+ (backend) — this repo's Dockerfile and CI use Python 3.11; please target 3.11+ when running locally
- Docker & docker-compose (recommended for full end-to-end development)

Note: we standardized on Python 3.11+ to match the project container/CI configuration.

## Quick development setup

Two recommended approaches: Docker (preferred for parity) or native local dev.

### 1) Docker (recommended)

From the repository root:

```cmd
docker-compose up --build
```

This starts Redis and the backend (FastAPI + Celery worker). The frontend can be run separately with `npm run dev` or served from the built assets.

### 2) Native local development

Backend (Windows example):

```cmd
cd backend
python -m venv ..\.venv
..\.venv\Scripts\activate
pip install -r requirements.txt
# Run the API
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm ci
npm run dev
```

### Environment variables

- Copy `.env.example` (repo root) to `.env` when running via Docker Compose.
- If running services manually, set the backend env vars (see `backend/.env.example`).

### Databases

- Redis is required for the worker/broker. Using Docker Compose is the easiest way to provision it.
- MongoDB: use an Atlas URI or a local Mongo instance; set `MONGO_URI` accordingly.

## Running tests & linters

Backend tests (pytest):

```cmd
cd backend
..\.venv\Scripts\activate
python -m pytest -q
```

Frontend build/tests:

```bash
cd frontend
npm ci
npm run build    # verify build succeeds
```

Formatting & linting

- Python: use `black` and `ruff` if you run linters locally.
- TypeScript: run your project's linters/formatters as configured (see `package.json`).

## Branching, commits & PR workflow

- Branch naming: `feat/<short-description>`, `fix/<short-description>`, `docs/<area>`, `chore/<what>`.
- Commit messages: use clear, imperative messages. Prefer Conventional Commits style when practical (e.g. `feat(auth): add signup endpoint`).
- Workflow:
  1. Fork the repo and create a feature branch from `main`.

2.  Make small, focused commits; run tests locally.
3.  Push to your fork and open a PR against `main` with a descriptive title and summary.

## PR checklist (include in PR description)

- [ ] Tests pass locally and CI (if applicable)
- [ ] New behavior covered by tests where appropriate
- [ ] Documentation updated (README, inline comments)
- [ ] No sensitive data (secrets) included
- [ ] Followed branch & commit naming conventions

Maintainers will review, request changes if necessary, then merge when ready.

## Communication & support

- For design/large changes, open an issue first to gather feedback.
- Use GitHub Issues or Discussions for questions. Link to relevant issues from PRs.

## Code of Conduct

By participating in this project you agree to abide by our Code of Conduct (`CODE_OF_CONDUCT.md`). Please be respectful and welcoming.
