param(
    [Parameter(ValueFromRemainingArguments=$true)]
    [String[]]$args
)

# Run backend tests from repo root with PYTHONPATH set to backend
# Usage: ./run_tests_pwsh.ps1 -args "-k test_name"

$projectRoot = $PSScriptRoot
$env:PYTHONPATH = Join-Path $projectRoot 'backend'
Set-Location $projectRoot

pytest -q backend\tests @args
