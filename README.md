---
# Revu — Product Review Intelligence

> Smart scraping, summarization, and insights from product reviews

[![License: MIT]][license-badge] [![CI]][ci-badge] [![Build]][build-badge]

Revu helps teams and researchers extract, analyze, and summarize product reviews at scale. It provides a scraper for collecting review bodies, sentiment analysis, topic extraction, and concise summaries to surface the most important customer feedback.

Why Revu?
- Collects full review text (not just ratings)
- Runs safe, rate-limited scraping jobs with per-user quotas
- Provides sentiment, topic extraction, and multi-backend summarization

Key features
- Manual HTML scraper with Playwright fallback for robust scraping
- Per-user rate limiting and job queueing with Celery + Redis
- Sentiment analysis and topic extraction pipelines
- Summarization backends with fallback (Gemini → TextRank)
- Docker-ready with a development and production-friendly setup

Tech stack
- Backend: FastAPI, Celery, Redis, MongoDB (Motor)
- Scraper: requests + BeautifulSoup, Playwright (optional)
- Frontend: React + Vite + TypeScript
- Tests: pytest (backend), Jest/Vitest (frontend)

Quick start — Docker (recommended)

1. Copy environment template and fill values:

```bash
cp .env.example .env
# edit .env with your values (MONGO_URI, JWT_SECRET, etc.)
```

2. Build and start all services:

```bash
docker-compose up --build -d
```

3. Open the app and docs:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

Local development (backend)

```bash
cd backend
python -m venv ../.venv
..\.venv\Scripts\activate   # Windows
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Run backend tests:

```bash
cd backend
..\.venv\Scripts\activate
python -m pytest -q
```

Local development (frontend)

```bash
cd frontend
npm ci
npm run dev
```

Contributing
- See `CONTRIBUTING.md` for guidelines on reporting issues, proposing features, and submitting pull requests.

License
- This project is released under the MIT License — see the `LICENSE` file.

CI / Workflows
- This repository includes GitHub Actions workflows for continuous integration (tests/builds). See `.github/workflows/ci.yml` and `.github/workflows/test.yml`.

Need help?
- Check the Troubleshooting section in this README, the project Issues, or open a new issue.

---

_This README was updated to include contributor guidance, license details, and CI references._

[license-badge]: https://img.shields.io/badge/license-MIT-green
[ci-badge]: https://github.com/harshitaphadtare/Revu/actions/workflows/ci.yml/badge.svg
[build-badge]: https://img.shields.io/badge/build-passing-brightgreen
[license]: LICENSE
[ci]: .github/workflows/ci.yml
