@echo off
title Voices of Heritage Root Launcher
echo ==========================================================
echo VOICES OF HERITAGE - Starting Services on Localhost
echo ==========================================================

echo Stopping any stale processes on ports 3000, 4001, 5002, 5003...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :4001') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5002') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5003') do taskkill /f /pid %%a >nul 2>&1

echo [1/4] Starting Auth Service (Port 4001)...
start "VOH - Auth Service (Port 4001)" cmd /k "cd /d "%~dp0backend\auth-service" && node src/index.js"

echo [2/4] Starting AI Planner Service (Port 5002)...
start "VOH - AI Planner (Port 5002)" cmd /k "cd /d "%~dp0backend\ai-planner-service" && node src/index.js"

echo [3/4] Starting Research Service (Port 5003)...
start "VOH - Research Service (Port 5003)" cmd /k "cd /d "%~dp0backend\research-service" && node src/index.js"

echo [4/4] Starting Frontend (Port 3000)...
cd /d "%~dp0frontend"
npm run dev
