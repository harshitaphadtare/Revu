# Lightweight Python image (no browser dependencies needed)
FROM python:3.11-slim

# Create app directory
WORKDIR /app

COPY requirements.txt ./requirements.txt

# Install Python dependencies only (no browsers needed with Apify)
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source (when the Docker build context is the `backend/` folder)
# If your CI supplies the repository root as the build context and uses this Dockerfile
# you can instead set the build context to `backend/` in Render. This Dockerfile assumes
# it is executed with the `backend` directory as the build context.
COPY . ./

# Environment
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV REDIS_URL=redis://redis:6379/0

EXPOSE 8000

# Default command can be overridden by docker-compose service command
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
