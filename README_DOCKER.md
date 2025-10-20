# Run Revu with Docker Compose

This brings up Redis, the FastAPI backend, and the Celery worker with Playwright browsers preinstalled.

## Requirements

- Docker Desktop

## Build and run

From repo root:

```
docker compose up --build
```

Services:

- redis: exposed on localhost:6379
- backend: FastAPI on http://localhost:8000
- worker: Celery worker attached to the same image/environment

Logs will stream in your terminal. Press Ctrl+C to stop.

## Notes

- The backend image uses `mcr.microsoft.com/playwright/python` so Playwright browsers are available inside the container.
- The backend and worker share the same image; overriding the command runs either uvicorn or celery.
- If you change Python dependencies, re-run with `--build` to rebuild the image.
