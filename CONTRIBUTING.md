# Contributing to Revu

Thank you for your interest in contributing to Revu! We welcome bug reports, documentation updates, tests, and new features.

This guide explains how to get started, the recommended development workflow, and what we expect from contributors.

## Table of contents

- Getting started
- Development workflow
- Branching & commits
- Testing & verification
- Code style & linting
- Submitting a pull request
- Reporting security issues

## Getting started

1. Fork the repository and clone your fork:

```bash
git clone <your-fork-url>
cd Revu
```

2. Prerequisites

- Node 18+ and npm
- Python 3.11+
- Docker & docker-compose (recommended for full-stack parity)

3. Quick setup

Backend (virtualenv):

```bash
cd backend
python -m venv ../.venv
..\.venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

Frontend:

```bash
cd frontend
npm ci
npm run dev
```

Or run everything with Docker Compose:

```bash
docker-compose up --build
```

Copy environment templates where provided:

- `cp .env.example .env`
- `cp backend/.env.example backend/.env`

## Development workflow

- Prefer `docker-compose` for an end-to-end environment that matches CI and developer expectations.
- For iterative backend work, run the FastAPI app with Uvicorn and run Celery workers locally.
- Use FastAPI's built-in OpenAPI docs at `http://localhost:8000/docs` to exercise routes.

## Branching & commits

- Branch naming: `feat/<short-desc>`, `fix/<short-desc>`, `chore/<what>`, `docs/<area>`
- Keep commits small and focused. Use imperative commit messages (e.g., "Add user signup endpoint").
- We encourage Conventional Commits but do not enforce them strictly.

## Testing & verification

Run backend tests:

```bash
cd backend
..\.venv\Scripts\activate
python -m pytest -q
```

Frontend build and tests:

```bash
cd frontend
npm ci
npm run build
npm run test   # if tests exist
```

If you add routes, services, or components, include unit tests and, when appropriate, small integration tests.

## Code style & linting

- Python: follow PEP 8 for readability. If you use formatters (black, ruff), run them locally before pushing.
- TypeScript/React: keep code modular and typed. Prefer small functional components and clear prop shapes.

## Submitting a Pull Request

1. Ensure your branch is up to date with `main`.
2. Open a concise PR describing the purpose, the key changes, and any trade-offs.
3. Link related issues (e.g., "Fixes #123").
4. Add a short testing/verification checklist and any manual steps required.
5. Run the test-suite and ensure no secrets are included.

Suggested PR checklist to include in the description:

- [ ] Tests pass locally (`python -m pytest`)
- [ ] Relevant documentation updated (README, docstrings)
- [ ] No sensitive data (secrets) included
- [ ] Additions are covered by tests where reasonable

## Reporting security issues

If you discover a security vulnerability, please do not open a public issue. Instead, see `SECURITY.md` for private reporting instructions.

## Contact

If you have questions about contribution workflow, open an issue or contact the maintainers via the repository.

Thank you — contributors make this project better!
# Contributing to Revu

Thank you for your interest in contributing to Revu! We welcome improvements, bug reports, documentation updates, and new features. This file explains how to get started and what we expect from contributors.

Table of contents

- What to report (bugs & features)
- Development setup (quick)
- How to submit changes (PR flow)
- Coding style and tests
- Commit messages & PR checklist
- Communication & support
- Code of Conduct

1. Reporting bugs

- Use GitHub Issues for bug reports: open a new issue in this repository.
- When reporting, include:
  - A descriptive title and short summary
  - Steps to reproduce (minimal if possible)
  - Expected vs actual behavior
  - Environment details (OS, Python/Node versions, Docker or local)
  - Any relevant logs or error messages (attach snippets)

2. Suggesting new features

- Use GitHub Issues and label the issue as a "feature request".
- Explain the problem you're solving and include examples and proposed behavior.
- If you can, sketch a short API/UX proposal or a mockup.

3. Development setup (quick)

- Clone the repository and install backend dependencies:

```bash
git clone <your-repo-url>
cd Revu
cd backend
python -m venv ../.venv
..\.venv\Scripts\activate    # Windows
pip install -r requirements.txt
```

- Frontend (Node):

```bash
cd frontend
npm ci
```

- If you prefer Docker (recommended for parity):

```bash
docker-compose up --build
```

4. How to submit changes (pull request flow)

- Fork the repository on GitHub.
- Create a feature branch in your fork (use a descriptive branch name):

```bash
git checkout -b feat/short-description
```

- Make commits that each do one logical change. Keep commits small and focused.
- Run existing tests and add new tests for bug fixes or features when appropriate.
- Push your branch to your fork and open a Pull Request (PR) against `main`.
- In the PR description, explain the purpose of the PR, list the main changes, and reference any related issues (e.g., "Fixes #123").

5. Coding style & tests

- Backend: follow common Python idioms (PEP8). We're lightweight on style enforcement but aim for readability.
- Write tests for any non-trivial change. Run the test suite locally:

```bash
cd backend
..\.venv\Scripts\activate
python -m pytest -q
```

- Frontend: follow existing TypeScript/React patterns. Run frontend tests/build locally:

```bash
cd frontend
npm ci
npm run build
```

6. Commit messages & PR checklist

- Use clear, imperative commit messages (e.g., "Add X feature", "Fix Y bug").
- PR checklist (include in PR description):
  - [ ] The code builds and tests pass locally
  - [ ] New behavior is covered by tests (where appropriate)
  - [ ] Relevant documentation updated (README, docstrings)
  - [ ] No sensitive data (secrets) included

7. Communication & support

- For design or large changes, open an issue first to discuss the approach.
- Use GitHub Discussions (if enabled) or Issues for general questions.

8. Code of Conduct

- By participating in this project you agree to abide by our Code of Conduct: see `CODE_OF_CONDUCT.md` for details.

Thanks for improving Revu — contributors are the heart of open-source projects. We appreciate your time and care.

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
