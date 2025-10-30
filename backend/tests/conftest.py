# Ensure the backend package (containing the 'app' module) is importable when running tests locally.
# This makes 'from app....' imports succeed regardless of the working directory.

import sys
from pathlib import Path

# Path to the backend directory (parent of this tests folder)
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
