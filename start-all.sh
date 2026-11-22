#!/usr/bin/env bash

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

echo "========================================================"
echo "  Launching MindVault Full-Stack Platform..."
echo "========================================================"

echo "[1/3] Starting AI Microservice on http://localhost:8000 ..."
(cd "$DIR/ai-service" && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload) &
AI_PID=$!

sleep 2

echo "[2/3] Starting Backend API on http://localhost:4000 ..."
(cd "$DIR/backend" && npm run dev) &
BACKEND_PID=$!

sleep 2

echo "[3/3] Starting Frontend on http://localhost:3000 ..."
(cd "$DIR/frontend" && npm run dev) &
FRONTEND_PID=$!

echo "========================================================"
echo "All MindVault services are running!"
echo " - Frontend:   http://localhost:3000"
echo " - Backend:    http://localhost:4000/api/v1"
echo " - AI Service: http://localhost:8000/docs"
echo "Press [CTRL+C] to stop all services."
echo "========================================================"

trap "kill $AI_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
