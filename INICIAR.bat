@echo off
title Ilha 40 - Site
cd /d "%~dp0"
if not exist "dados\resultados.js" (
  echo Dados ainda nao gerados. Rodando a simulacao primeiro...
  call "%~dp0SIMULAR.bat" nopause
)
echo Abrindo o site no navegador padrao...
start "" "%~dp0index.html"