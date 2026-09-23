$ErrorActionPreference = 'Stop'
& uv run --project "$PSScriptRoot/.." --frozen --extra dev python "$PSScriptRoot/dev.py" @args
exit $LASTEXITCODE
