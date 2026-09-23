$ErrorActionPreference = 'Stop'
& uv run --project "$PSScriptRoot/.." --frozen --extra dev python "$PSScriptRoot/check.py" @args
exit $LASTEXITCODE
