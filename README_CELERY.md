# Revu Background Scraper (Celery + Redis)

## Prereqs

- Python 3.11+
- Node (for frontend if needed)
- Redis running locally
- Playwright browsers installed

## 1) Install Python deps

From repo root:

```
cd backend
pip install -r requirements.txt
# Install Playwright browsers
python -m playwright install
```

## 2) Start Redis

- Option A: Docker (recommended)

```
docker run --name redis -p 6379:6379 -d redis:7-alpine
```

- Option B: Native Redis for Windows via WSL or a Redis service (ensure it listens on localhost:6379)

## 3) Start Celery worker

In a new terminal:

```
cd backend
# Windows note: prefork works on Python 3.8+; if you see issues, set pool=solo
REM Limit total reviews scraped (default now 1200 if not provided)
set SCRAPER_MAX_REVIEWS=1200
celery -A app.worker.celery_app worker -l info --pool=solo
```

## 4) Start FastAPI

In another terminal:

```
cd backend
uvicorn app.main:app --reload
```

Your API endpoints:

- POST http://127.0.0.1:8000/start-scrape with JSON: {"url": "https://..."}
- GET http://127.0.0.1:8000/scrape-status/{job_id}

## 5) Frontend

Use the provided React components in `frontend/src/components`:

- ScraperComponent.js (main UI)
- JobProgress.js (progress bar)
- ResultsDisplay.js (list)

Set `REACT_APP_API_BASE` to your API base if not default.

## Configure scrape limits

- Default cap is 1200 reviews across Amazon/Flipkart. You can change it per run:

Windows cmd (local dev):

```
set SCRAPER_MAX_REVIEWS=1500
set SCRAPER_MAX_PAGES=40
celery -A app.worker.celery_app worker -l info --pool=solo
```

Docker Compose (already set to 1200 in `docker-compose.yml`):

```
	worker:
		environment:
			- REDIS_URL=redis://redis:6379/0
			- SCRAPER_MAX_REVIEWS=1200
```

Notes:

- The scraper stops early once the cap is reached.
- Page cap (`SCRAPER_MAX_PAGES`) is a safety guard (default 50).
