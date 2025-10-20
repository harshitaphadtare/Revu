# Backend image with Playwright browsers using the official base image
FROM mcr.microsoft.com/playwright/python:v1.55.0-jammy

# Create app directory
WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./requirements.txt
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
