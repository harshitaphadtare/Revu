# Overview

Revu is a product review intelligence platform that scrapes product reviews (currently Amazon), analyzes sentiment and topics, and generates concise summaries and insight reports. It pairs a FastAPI backend (with Celery workers), a React + Vite frontend, Redis for queueing, and MongoDB for persistence.

This README provides a quick developer and operator guide: setup, API examples, project layout, testing, deployment notes, and contribution guidelines.

## Project structure

```
Revu/
├── backend/
│   ├── app/
│   │   ├── main.py                # FastAPI app
│   │   ├── worker.py              # Celery worker setup
│   │   ├── routes/                # API route handlers
│   │   ├── services/              # Scraper, summarizer, sentiment, topic extractor
│   │   └── models/                # Pydantic schemas
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/                       # React + Vite app
│   └── package.json
├── docker-compose.yml
├── README.md
├── LICENSE
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
└── tests/                         # Small end-to-end and unit tests
```

## Quick start (Docker — recommended)

1. Copy environment template and set secrets:

```bash
cp .env.example .env
# Edit .env: MONGO_URI, JWT_SECRET, REDIS_URL, SCRAPER_MAX_REVIEWS, GEMINI_API_KEY (optional)
```

2. Build and start everything:

```bash
docker-compose up --build -d
```

3. Verify services:

- Frontend: http://localhost:3000
- Backend API (Swagger): http://localhost:8000/docs
- Redis: localhost:6379

Notes:

- The backend Dockerfile installs Playwright and browser binaries by default to enable the scraper fallback for JS-heavy pages. This increases image size.

## Local development (backend)

```bash
cd backend
python -m venv ../.venv
..\.venv\Scripts\activate   # Windows
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Start a worker (separate terminal):

```bash
cd backend
..\.venv\Scripts\activate
celery -A app.worker.celery_app worker -l info --pool=solo
```

Frontend (local):

```bash
cd frontend
npm ci
npm run dev
```

## Environment variables

Important variables (see `.env.example`):

- MONGO_URI - MongoDB connection string
- JWT_SECRET - JWT signing secret
- REDIS_URL - Redis connection URL
- SCRAPER_MAX_REVIEWS - Default max per scrape (capped at 300)
- SUMMARY_BACKEND - `gemini` or `textrank`

## API - endpoints & examples

The backend exposes REST endpoints. Below are commonly used endpoints and examples.

Authentication

- `POST /auth/signin` - returns JWT access token
- `POST /auth/signup` - new user signup

Start a scrape (requires Authorization header):

```bash
curl -X POST "http://localhost:8000/start-scrape" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.amazon.com/dp/B0FQG1LPVF"}'
```

Response:

```json
{ "job_id": "<celery-task-id>" }
```

Check status/result:

```bash
curl "http://localhost:8000/scrape-status/<job_id>"
```

Cancel job:

```bash
curl -X POST "http://localhost:8000/cancel-scrape/<job_id>"
```

Analyze (run analysis on a set of reviews / custom input):

```bash
curl -X POST "http://localhost:8000/analyze/" -H "Content-Type: application/json" -d '{"text": "This product is great..."}'
```

Other endpoints:

- `GET /scrape-lock-status` - check if a scrape lock is held
- `GET /scrape-status/{job_id}` - job progress/result
- `GET /auth/me` - current user

## Scraper behavior and limits

- Default per-user daily limit: 5 scrapes/day (enforced via Redis)
- Each scrape is capped at 300 reviews to avoid blocking
- The scraper tries requests+BeautifulSoup first, then falls back to Playwright (headless) when needed
- Respect robots and site terms: this tool is provided for research and controlled usage

## Example: predict-like flow (frontend integration)

In `frontend/src/lib/api.ts` there are helpers like `apiStartScrape` and `apiLockStatus` used by the UI. The typical flow:

1. User supplies Amazon product URL in the frontend.
2. Frontend calls `POST /start-scrape` with JWT Authorization header.
3. Backend enqueues Celery job; frontend polls `GET /scrape-status/{job_id}`.
4. Once job succeeds, the frontend displays extracted reviews, sentiment, topics, and summary.

## Outputs & saved artifacts

- `saved_models/` - trained models (if using summarizer/ML pipelines)
- `output/` - generated summaries, CSVs, and visualizations
- `logs/` - application and worker logs

## Testing

Run backend tests:

```bash
cd backend
..\.venv\Scripts\activate
python -m pytest -q
```

Frontend tests/build:

```bash
cd frontend
npm ci
npm run build
npm run test
```

## Development tips & debugging

- If Vite or CI fails with missing file errors on Linux, check case-sensitivity of filenames and commits (Windows is case-insensitive).
- Add temporary debug steps in `.github/workflows/ci.yml` to `ls` suspect directories if CI can't find a file.
- Increase `pause_seconds` in `scraper.py` if you observe frequent captcha/blocking.

## Contributing

See `CONTRIBUTING.md` for bug reports, feature requests, and PR workflow. Be sure to run tests and include clear descriptions in PRs.

## Code of Conduct

Our community follows the `CODE_OF_CONDUCT.md`. Please read and adhere to it.

## License

This project is licensed under the MIT License — see the `LICENSE` file for details.

## Maintainers

- Primary maintainer: harshitaphadtare
- Contact: harshita.codewiz@gmail.com
