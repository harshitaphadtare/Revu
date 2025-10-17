@echo off
REM Run backend tests from repo root with PYTHONPATH set to backend
REM Usage: double-click or run in cmd from any working directory
REM Additional pytest args can be passed, e.g. run_tests_py.bat -k test_name

REM Resolve script directory and set PYTHONPATH to the backend folder
set SCRIPT_DIR=%~dp0
set PYTHONPATH=%SCRIPT_DIR%backend

REM Ensure we run from repo root
cd /d %SCRIPT_DIR%

pytest -q backend\tests %*
