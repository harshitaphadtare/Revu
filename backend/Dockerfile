# Lightweight Python image (no browser dependencies needed)
FROM python:3.11-slim

# Create app directory
WORKDIR /app

COPY backend/requirements.txt ./requirements.txt

# Install Python dependencies only (no browsers needed with Apify)
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ ./

# Environment
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV REDIS_URL=redis://redis:6379/0

EXPOSE 8000

# Default command can be overridden by docker-compose service command
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
