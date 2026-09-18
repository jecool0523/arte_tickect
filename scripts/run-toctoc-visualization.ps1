$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$envFile = Join-Path $projectRoot ".env.local"
$pythonFile = "C:\Users\seocheon\Desktop\dimigo\arte\시각화 생성 코드.py"
$htmlFile = Join-Path (Split-Path -Parent $pythonFile) "전체_좌석_배치도_완성본.html"

if (-not (Test-Path -LiteralPath $pythonFile)) {
    throw "Python 파일을 찾을 수 없습니다: $pythonFile"
}

# Load local project variables without writing secrets to disk.
$env:NEXT_PUBLIC_SUPABASE_URL = "https://kwkhydnvbxvcfvhksxna.supabase.co"
if (Test-Path -LiteralPath $envFile) {
    Get-Content -LiteralPath $envFile -Encoding UTF8 | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $key, $value = $line.Split("=", 2)
            if ($key.Trim() -in @("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY")) {
                [Environment]::SetEnvironmentVariable($key.Trim(), $value.Trim().Trim('"').Trim("'"), "Process")
            }
        }
    }
}

if (-not $env:SUPABASE_SERVICE_ROLE_KEY) {
    $env:SUPABASE_SERVICE_ROLE_KEY = Read-Host "Supabase service_role/secret key를 입력하세요 (화면에 저장되지 않음)"
}

$python = Get-Command py -ErrorAction SilentlyContinue
if (-not $python) { $python = Get-Command python -ErrorAction SilentlyContinue }
if (-not $python) { throw "Python 실행 파일(py 또는 python)을 찾을 수 없습니다." }

& $python.Source $pythonFile
if ($LASTEXITCODE -ne 0) { throw "시각화 생성에 실패했습니다. 종료 코드: $LASTEXITCODE" }

if (Test-Path -LiteralPath $htmlFile) {
    Start-Process -FilePath $htmlFile
    Write-Host "완료: $htmlFile"
}
