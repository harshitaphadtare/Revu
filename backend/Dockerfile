# Lightweight Python image (no browser dependencies needed)
FROM python:3.11-slim

# Create app directory
WORKDIR /app

# Copy requirements and install system deps needed by Playwright
COPY backend/requirements.txt ./requirements.txt

# Install OS packages required by Playwright's browser engines and common
# runtime libraries. Keep the list minimal but adequate for Chromium/Firefox/WebKit.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    ca-certificates \
    wget \
    gnupg \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libxss1 \
    libpangocairo-1.0-0 \
    libgtk-3-0 \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies (includes playwright)
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers and required system dependencies in one step.
# This downloads the browser binaries (Chromium/Firefox/WebKit) used by Playwright.
RUN python -m playwright install --with-deps || true

# Copy backend source
# Copy backend source
COPY backend/ ./

# Environment
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV REDIS_URL=redis://redis:6379/0

EXPOSE 8000

# Default command can be overridden by docker-compose service command
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
