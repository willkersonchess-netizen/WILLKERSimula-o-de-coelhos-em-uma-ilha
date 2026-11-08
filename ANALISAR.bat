@echo off
title Ilha 40 - Analise
cd /d "%~dp0"
set "PY=python"
where py >nul 2>nul && set "PY=py -3"
%PY% analyze_results.py
pause