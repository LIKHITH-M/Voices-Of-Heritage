#!/bin/bash
echo "Stopping Voices of Heritage services on ports 3000, 4001, 5002, 5003..."
for port in 3000 4001 5002 5003; do
  pid=$(lsof -ti :$port 2>/dev/null)
  if [ -n "$pid" ]; then
    echo "Stopping process on port $port (PID: $pid)..."
    kill -9 $pid 2>/dev/null || true
  fi
done
echo "All services stopped."

