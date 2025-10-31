# Overview

Revu is a product review intelligence platform that scrapes product reviews (currently works for [Amazon](https://amazon.com). Revu then analyzes sentiment and topics, and generates concise summaries and insight reports. It pairs a FastAPI backend (with Celery workers), a React + Vite frontend, Redis for queueing, and MongoDB for persistence.

This is a quick developer and operator guide: setup, API examples, project layout, testing, deployment notes, and contribution guidelines.

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

## Getting Started

### Option 1: Docker (Recommended)

The fastest way to get everything running with consistent parity across environments.

1. **Copy environment template and set secrets:**

```bash
cp .env.example .env
# Edit .env with your configuration (see Environment Variables table below)
```

2. **Build and start all services:**

```bash
docker-compose up --build -d
```

3. **Verify services are running:**

- Frontend: http://localhost:3000
- Backend API (Swagger docs): http://localhost:8000/docs
- Redis: localhost:6379

**Note:** The backend Dockerfile installs Playwright and browser binaries by default to enable the scraper fallback for JS-heavy pages. This increases image size but provides robust scraping.

### Option 2: Local Development (Native)

If you prefer running services outside Docker:

**Backend setup:**

```bash
cd backend
python -m venv ../.venv
..\.venv\Scripts\activate   # Windows (use `source ../.venv/bin/activate` on Linux/Mac)
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Start Celery worker** (separate terminal):

```bash
cd backend
..\.venv\Scripts\activate
celery -A app.worker.celery_app worker -l info --pool=solo
```

**Frontend setup:**

```bash
cd frontend
npm ci
npm run dev
```

**Prerequisites for local dev:**

- Python 3.11+
- Node.js 18+ and npm
- Redis running (use Docker: `docker run -d -p 6379:6379 redis:7-alpine` or install locally)
- MongoDB (Atlas URI or local instance)

### Environment Variables

Configure these in `.env` (for Docker) or `backend/.env` (for local backend):

| Variable              | Description                                                | Default / Example                                              |
| --------------------- | ---------------------------------------------------------- | -------------------------------------------------------------- |
| `MONGO_URI`           | MongoDB connection string                                  | `mongodb+srv://<username>:<password>@cluster.mongodb.net/revu` |
| `MONGO_DB`            | Database name                                              | `revu`                                                         |
| `JWT_SECRET`          | Secret for JWT token signing                               | `change-me-to-secure-random-string`                            |
| `JWT_EXPIRES_MIN`     | JWT token expiration (minutes)                             | `60`                                                           |
| `REDIS_URL`           | Redis connection URL                                       | `redis://localhost:6379/0`                                     |
| `SCRAPER_MAX_REVIEWS` | Max reviews per scrape (hard capped at 300)                | `300`                                                          |
| `SUMMARY_BACKEND`     | Summarizer engine: `gemini` or `textrank`                  | `gemini`                                                       |
| `GEMINI_API_KEY`      | Google Gemini API key (required if using `gemini` backend) | Your API key                                                   |
| `GEMINI_MODEL`        | Optional: specific Gemini model name                       | `gemini-1.5-flash`                                             |

## API - endpoints & examples

The backend exposes REST endpoints. Below are commonly used endpoints and examples.

Authentication

- `POST /auth/signin` - returns JWT access token
- `POST /auth/signup` - new user signup
- `GET /auth/me` - get current user (requires Bearer token)
- `PATCH /api/me` - update profile (requires Bearer token)
- `POST /api/auth/change-password` - change password (requires Bearer token and current password)

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
# Activate virtual environment first
python -m pytest tests/
python -m pytest tests/test_account_routes.py  # profile & password endpoints
```

Frontend tests/build:

```bash
cd frontend
npm ci
npm run build
npm run test
```

## Code quality & formatting

This repository includes formatter and linter configurations to maintain consistent code style:

- **Python** (backend):
  - Black for formatting (line-length 120)
  - Ruff for linting
  - Isort for import sorting
  - Config: `pyproject.toml`
- **TypeScript/React** (frontend):
  - ESLint for linting
  - Prettier for formatting
  - Config: `.eslintrc.json`, `.prettierrc`

Run formatters before committing:

```bash
# Backend
black backend/
ruff check backend/ --fix

# Frontend
cd frontend
npm run lint --fix
npx prettier --write src/
```

## Contributing

See our [contribution guidelines](https://github.com/harshitaphadtare/Revu/blob/main/CONTRIBUTING.md) for how to write bug reports and feature requests, and read more about our PR workflow. Be sure to run tests and include clear descriptions in PRs.

## Code of Conduct

Our community follows the Contributor Covenant as the basis for our [Code of Conduct](https://github.com/harshitaphadtare/Revu/blob/main/CODE_OF_CONDUCT.md). Please read and adhere to it.

## License

This project is licensed under the MIT License. See the [LICENSE file](https://github.com/harshitaphadtare/Revu/blob/main/LICENSE) for details.

## Maintainers

- Primary maintainer: harshitaphadtare
- Contact: harshita.codewiz@gmail.com
