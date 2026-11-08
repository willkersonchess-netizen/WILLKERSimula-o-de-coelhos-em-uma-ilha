@echo off
title Ilha 40 - Servidor local (feche esta janela para parar)
cd /d "%~dp0"
set "PY=python"
where py >nul 2>nul && set "PY=py -3"
echo Servindo em http://localhost:8040  (Ctrl+C para parar)
start "" http://localhost:8040
%PY% -m http.server 8040 --bind 127.0.0.1