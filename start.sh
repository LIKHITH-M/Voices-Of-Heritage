#!/usr/bin/env bash

# ==============================================================================
# Voices of Heritage — Unified Local Startup Script
# ==============================================================================

#cd "/Users/likhithmr/Desktop/voices of heritage main/voiceofheritage-main--main" && ./start.sh

set -e

# Resolve directory of this script (project root)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "=========================================================="
echo "🏛️  VOICES OF HERITAGE — Starting All Services on Localhost"
echo "=========================================================="

# 1. Clean up any existing processes on ports 3000, 4001, 5002
echo "🧹 Checking and freeing project ports (3000, 4001, 5002)..."
for port in 3000 4001 5002; do
  pids=$(lsof -ti :$port 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "   Freeing port $port (PID: $pids)"
    kill -9 $pids 2>/dev/null || true
  fi
done

# Trap Ctrl+C (SIGINT) and termination (SIGTERM) to cleanly stop all background processes
cleanup() {
  echo ""
  echo "🛑 Stopping all Voices of Heritage background services..."
  pids_to_kill=$(jobs -p 2>/dev/null || true)
  if [ -n "$pids_to_kill" ]; then
    kill $pids_to_kill 2>/dev/null || true
  fi
  for port in 3000 4001 5002; do
    pids=$(lsof -ti :$port 2>/dev/null || true)
    if [ -n "$pids" ]; then
      kill -9 $pids 2>/dev/null || true
    fi
  done
  echo "✅ All services stopped. Goodbye!"
  exit 0
}
trap cleanup SIGINT SIGTERM

# 2. Start Auth Microservice (Port 4001)
echo "🚀 [1/3] Starting Auth Microservice (Port 4001)..."
(
  cd "$PROJECT_ROOT/backend/auth-service"
  node src/index.js
) &

# 3. Start AI Trip Planner Backend + DEPKG (Port 5002)
echo "🚀 [2/3] Starting AI Planner + DEPKG API (Port 5002)..."
(
  cd "$PROJECT_ROOT/backend/ai-planner-service"
  node src/index.js
) &

# 4. Start Main Voices of Heritage Web App (Port 3000)
echo "🚀 [3/3] Starting Main Frontend Portal (Port 3000)..."
(
  cd "$PROJECT_ROOT/frontend"
  npm run dev
) &

echo ""
echo "⏳ Waiting for services to initialize..."
sleep 4

echo ""
echo "=========================================================="
echo "🎉 ALL VOICES OF HERITAGE SERVICES ARE ONLINE!"
echo "=========================================================="
echo "🌐 Main Application      : http://localhost:3000"
echo "🔐 Auth Service API      : http://localhost:4001/health"
echo "🧠 AI Planner + DEPKG    : http://localhost:5002/api/health"
echo "🏛️  Trip Planner (DEPKG)  : http://localhost:3000/trip-planner"
echo "=========================================================="
echo "Press Ctrl + C anytime in this terminal to stop all servers."
echo ""

# Keep running and wait for all background processes
wait
