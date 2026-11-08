@echo off
title Ilha - Analise
cd /d "%~dp0"
set "PY=python"
where py >nul 2>nul && set "PY=py -3"
%PY% analyze_results.py
%PY% analyze_results.py 100
pause