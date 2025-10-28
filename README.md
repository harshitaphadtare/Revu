# Revu - Product Review Intelligence Platform

A comprehensive platform for scraping, analyzing sentiment and topics, and summarizing product review insights. Built with React frontend and FastAPI backend with Celery workers, Redis, and MongoDB.

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

1. **Clone and setup environment**:

   ```bash
   git clone <your-repo-url>
   cd Revu
   ```

2. **Create environment file**:

   ```bash
   # Create .env file in the root directory
   cp .env.example .env  # If available, or create manually
   ```

3. **Configure environment variables**:

   ```env
   MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.mongodb.net/?retryWrites=true&w=majority
   MONGO_DB=revu
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRES_MIN=1440
   ```

4. **Start all services**:

   ```bash
   docker-compose up --build
   ```

5. **Access the application**:
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:8000
   - **API Documentation**: http://localhost:8000/docs
   - **Redis**: localhost:6379

### Option 2: Manual Development Setup

#### Prerequisites

- Python 3.11+
- Node.js 18+
- Redis server
- MongoDB Atlas account (or local MongoDB)

#### Backend Setup

1. **Navigate to backend directory**:

   ```bash
   cd backend
   ```

2. **Create virtual environment**:

   ```bash
   # Windows
   python -m venv ..\.venv
   ..\.venv\Scripts\activate

   # macOS/Linux
   python -m venv ../.venv
   source ../.venv/bin/activate
   ```

3. **Install dependencies**:

   ```bash
   pip install -r requirements.txt
   python -m playwright install
   ```

4. **Start Redis** (if not using Docker):

   ```bash
   # Using Docker
   docker run -d -p 6379:6379 --name revu-redis redis:7-alpine

   # Or install Redis locally
   ```

5. **Set environment variables**:

   ```bash
   # Windows
   set MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.mongodb.net/?retryWrites=true&w=majority
   set MONGO_DB=revu
   set JWT_SECRET=your-super-secret-jwt-key-here
   set JWT_EXPIRES_MIN=1440
   set REDIS_URL=redis://localhost:6379/0

   # macOS/Linux
   export MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.mongodb.net/?retryWrites=true&w=majority
   export MONGO_DB=revu
   export JWT_SECRET=your-super-secret-jwt-key-here
   export JWT_EXPIRES_MIN=1440
   export REDIS_URL=redis://localhost:6379/0
   ```

6. **Start the backend API**:

   ```bash
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

7. **Start the Celery worker** (in a new terminal):

   ```bash
   cd backend
   # Activate the same virtual environment
   ..\.venv\Scripts\activate  # Windows
   # source ../.venv/bin/activate  # macOS/Linux

   celery -A app.worker.celery_app worker -l info --pool=solo
   ```

#### Frontend Setup

1. **Navigate to frontend directory**:

   ```bash
   cd frontend
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Start development server**:

   ```bash
   npm run dev
   ```

4. **Access the frontend**: http://localhost:3000

## 🏗️ Project Structure

```
Revu/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── db/             # Database configuration
│   │   ├── models/         # Data models and schemas
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utility functions
│   │   ├── main.py         # FastAPI app
│   │   └── worker.py       # Celery worker
│   ├── tests/              # Test files
│   ├── Dockerfile          # Backend container
│   └── requirements.txt    # Python dependencies
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── styles/         # CSS styles
│   │   └── main.tsx        # App entry point
│   ├── package.json        # Node dependencies
│   └── vite.config.ts      # Vite configuration
├── docker-compose.yml      # Docker services
└── README.md              # This file
```

## 🔧 Environment Variables

| Variable              | Description               | Required | Default                    |
| --------------------- | ------------------------- | -------- | -------------------------- |
| `MONGO_URI`           | MongoDB connection string | Yes      | -                          |
| `MONGO_DB`            | Database name             | No       | `revu`                     |
| `JWT_SECRET`          | Secret key for JWT tokens | Yes      | -                          |
| `JWT_EXPIRES_MIN`     | Token expiry in minutes   | No       | `60`                       |
| `REDIS_URL`           | Redis connection URL      | No       | `redis://localhost:6379/0` |
| `SCRAPER_MAX_REVIEWS` | Max reviews to scrape     | No       | `4000`                     |
| `SUMMARY_BACKEND`     | Summarization backend     | No       | `gemini` (Gemini→TextRank)   |
| `SUMMARY_BACKEND`     | Summarization backend     | No       | `gemini` (Gemini→TextRank)   |
| `GEMINI_API_KEY`      | Gemini API key            | No       | -                          |

## 📡 API Endpoints

### Authentication

- `POST /auth/signup` - User registration
- `POST /auth/signin` - User login
- `GET /auth/me` - Get current user (requires Bearer token)
- `PATCH /api/me` - Update profile (name/email; requires Bearer token; changing email marks it unverified)
- `POST /api/auth/change-password` - Change password (requires Bearer token and current password)

### Analysis

- `POST /analyze/` - Analyze review sentiment and topics

### Scraping

- `POST /start-scrape` - Start scraping job
- `GET /scrape-status/{job_id}` - Get scraping progress/results
- `POST /cancel-scrape/{job_id}` - Cancel scraping job
- `GET /scrape-lock-status` - Check scraping lock status

**Interactive API Documentation**: http://localhost:8000/docs

## 🧪 Testing

### Backend Tests

```bash
cd backend
# Activate virtual environment first
python -m pytest tests/
python -m pytest tests/test_account_routes.py  # profile & password endpoints
```

### Frontend Build

```bash
cd frontend
npm run build
```

## 🐳 Docker Services

The Docker Compose setup includes:

- **redis**: Redis server for caching and job queue
- **backend**: FastAPI application with auto-reload
- **worker**: Celery worker for background tasks

## 🚨 Troubleshooting

## 📝 Summarization Backends

Revu supports two summarization backends with automatic fallback:

Fallback order: Gemini → TextRank

- Gemini (recommended for highest fluency)

   - Set `SUMMARY_BACKEND=gemini`
   - Provide `GEMINI_API_KEY` (your Google/Vertex/Gemini API key)
   - Works in Docker: key is passed via `docker-compose.yml`

- TextRank (fastest, no ML)
   - Set `SUMMARY_BACKEND=textrank` or omit the API key
   - Frequency-based extractive summary; very fast and offline

Gemini setup (Docker):

```bash
# In .env (root)
SUMMARY_BACKEND=gemini
GEMINI_API_KEY=your_key_here

docker compose up --build
```

Notes:

- Large inputs (>4000 reviews) are automatically chunked and summarized with a map-reduce step for coherence.

### Common Issues

1. **Port 8000 already in use**:

   ```bash
   # Stop existing Docker containers
   docker stop revu-backend

   # Or use a different port
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
   ```

2. **Redis connection issues**:

   ```bash
   # Check if Redis is running
   docker ps | grep redis

   # Restart Redis if needed
   docker restart revu-redis
   ```

3. **MongoDB connection issues**:

   - Verify your MongoDB Atlas connection string
   - Check if your IP is whitelisted in MongoDB Atlas
   - Ensure the database user has proper permissions

4. **Frontend not connecting to backend**:
   - Check if backend is running on port 8000
   - Verify CORS settings in backend
   - Check browser console for errors

### Development Tips

- Use `docker-compose logs -f` to view real-time logs
- The backend supports hot-reload in development mode
- Frontend runs on port 3000 with hot-reload enabled
- Redis data persists in Docker volumes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

See `CONTRIBUTING.md` for detailed guidelines.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues:

1. Check the troubleshooting section above
2. Review the API documentation at http://localhost:8000/docs
3. Check the logs: `docker-compose logs -f`
4. Open an issue on GitHub

---

**Happy coding! 🎉**
