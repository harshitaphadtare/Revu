## Local Development

### Backend (Windows)

```powershell
cd backend
python -m venv ../.venv
..\.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Backend (macOS / Linux)

```bash
cd backend
python3 -m venv ../.venv
source ../.venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm ci
npm run dev
```

## Playwright and Docker

- Playwright is optional but recommended for robust scraping of JS-driven pages.
- The `backend/Dockerfile` installs Playwright and its browser binaries during image build. That makes the scraper fallback available inside containers but increases image size and build time.

If you prefer to install browsers selectively (smaller image), you can run inside the backend image build:

```dockerfile
RUN python -m playwright install chromium
```

Or, for local dev:

```bash
pip install playwright
python -m playwright install
```

## Testing

Run backend tests:

```bash
cd backend
..\.venv\Scripts\activate   # or source ../.venv/bin/activate
python -m pytest -q
```

Frontend build/test:

```bash
cd frontend
npm ci
npm run build
```

## Contributing

We welcome contributions — see `CONTRIBUTING.md` for detailed instructions on filing issues, proposing features, and submitting pull requests.

## Security

If you discover a security vulnerability, please do not open a public issue. Contact the maintainers privately at [MAINTAINER_EMAIL] (replace with your email) and provide steps to reproduce so we can triage and patch quickly.

## License

This project is licensed under the MIT License — see the `LICENSE` file for details.

## Maintainers & Contact

- Maintainer: harshitaphadtare
- Contact: [MAINTAINER_EMAIL]
  cd backend
  python -m venv ../.venv
  ..\.venv\Scripts\activate # Windows
  pip install -r requirements.txt
  python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

````

Run backend tests:

```bash
cd backend
..\.venv\Scripts\activate
python -m pytest -q
````

Local development (frontend)

```bash
cd frontend
npm ci
npm run dev
```

Contributing

- See `CONTRIBUTING.md` for guidelines on reporting issues, proposing features, and submitting pull requests.

License

- This project is released under the MIT License — see the `LICENSE` file.

CI / Workflows

- This repository includes GitHub Actions workflows for continuous integration (tests/builds). See `.github/workflows/ci.yml` and `.github/workflows/test.yml`.

Need help?

- Check the Troubleshooting section in this README, the project Issues, or open a new issue.

---

_This README was updated to include contributor guidance, license details, and CI references._

[license-badge]: https://img.shields.io/badge/license-MIT-green
[ci-badge]: https://github.com/harshitaphadtare/Revu/actions/workflows/ci.yml/badge.svg
[build-badge]: https://img.shields.io/badge/build-passing-brightgreen
[license]: LICENSE
[ci]: .github/workflows/ci.yml
