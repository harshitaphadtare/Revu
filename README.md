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

Note: The scraper uses a single Apify actor for reviews. Ensure your Apify account has access to the configured actor and that `APIFY_API_TOKEN` is set. If you see an error like "Apify scraping failed: You must rent a paid Actor...", either rent/enable the actor in Apify or change the reviews actor via environment variables described below.

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

| Variable                    | Description                                                         | Default / Example                                              |
| --------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------- |
| `MONGO_URI`                 | MongoDB connection string                                           | `mongodb+srv://<username>:<password>@cluster.mongodb.net/revu` |
| `MONGO_DB`                  | Database name                                                       | `revu`                                                         |
| `JWT_SECRET`                | Secret for JWT token signing                                        | `change-me-to-secure-random-string`                            |
| `JWT_EXPIRES_MIN`           | JWT token expiration (minutes)                                      | `60`                                                           |
| `REDIS_URL`                 | Redis connection URL                                                | `redis://localhost:6379/0`                                     |
| `SCRAPER_MAX_REVIEWS`       | Max reviews per scrape (hard capped at 300)                         | `300`                                                          |
| `APIFY_API_TOKEN`           | Apify API token                                                     | your token                                                     |
| `APIFY_REVIEWS_ACTOR`       | Optional: reviews actor id                                          | `axesso_data/amazon-reviews-scraper`                           |
| `APIFY_REVIEWS_EXTRA_INPUT` | Optional: JSON to merge into actor run input (actor-specific flags) | `{ "includeProductInfo": true }`                               |
| `SUMMARY_BACKEND`           | Summarizer engine: `gemini` or `textrank`                           | `gemini`                                                       |
| `GEMINI_API_KEY`            | Google Gemini API key (required if using `gemini` backend)          | Your API key                                                   |
| `GEMINI_MODEL`              | Optional: specific Gemini model name                                | `gemini-1.5-flash`                                             |

## Scraper behavior and limits

- Default per-user daily limit: 3 products/day (enforced via Redis)
- Each scrape is capped at 300 reviews to avoid blocking
- The scraper uses a single Apify actor to fetch reviews (configurable via `APIFY_REVIEWS_ACTOR`)
- Respect robots and site terms: this tool is provided for research and controlled usage

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

## Contributing

See `CONTRIBUTING.md` for bug reports, feature requests, and PR workflow. Be sure to run tests and include clear descriptions in PRs.

## Code of Conduct

Our community follows the `CODE_OF_CONDUCT.md`. Please read and adhere to it.

## License

This project is licensed under the MIT License — see the `LICENSE` file for details.

## Maintainers

- Primary maintainer: harshitaphadtare
- Contact: harshita.codewiz@gmail.com
