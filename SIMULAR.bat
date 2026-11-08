@echo off
title Ilha 40 - Simulacao
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado. Instale em https://nodejs.org e tente de novo.
  pause
  exit /b 1
)
echo Rodando a simulacao original, o Monte Carlo e os cenarios para 40 e 100 anos (leva alguns minutos)...
echo.
node simular.js
if errorlevel 1 (
  echo [ERRO] A simulacao falhou.
  pause
  exit /b 1
)
if /i "%~1"=="nopause" exit /b 0
echo.
echo Pronto. Abrindo o site...
start "" "%~dp0index.html"
pause