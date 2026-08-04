@echo off
setlocal
title Kelimeyi Bul
cd /d "%~dp0"

where python >nul 2>nul
if not errorlevel 1 (
  set "KELIME_PYTHON=python"
) else (
  where py >nul 2>nul
  if errorlevel 1 (
    echo Python bulunamadi. Python'u kurup tekrar deneyin.
    pause
    exit /b 1
  )
  set "KELIME_PYTHON=py"
)

set "KELIME_OYUNU_DIR=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$listener = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue;" ^
  "if (-not $listener) { Start-Process -FilePath $env:KELIME_PYTHON -ArgumentList '-m','http.server','8000','--bind','127.0.0.1' -WorkingDirectory $env:KELIME_OYUNU_DIR -WindowStyle Hidden; Start-Sleep -Milliseconds 900 };" ^
  "Start-Process 'http://localhost:8000'"

if errorlevel 1 (
  echo Oyun baslatilamadi. Lutfen tekrar deneyin.
  pause
  exit /b 1
)

endlocal
