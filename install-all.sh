#!/usr/bin/env bash
set -e

echo "========================================================"
echo "  MindVault - Installing All Dependencies (Mac/Linux)"
echo "========================================================"

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

echo "[1/3] Setting up Backend..."
cd "$DIR/backend"
npm install
npx prisma generate
npx prisma db push
npm run prisma:seed

echo "[2/3] Setting up Frontend..."
cd "$DIR/frontend"
npm install

echo "[3/3] Setting up Python AI Service..."
cd "$DIR/ai-service"
python3 -m pip install -r requirements.txt || pip install -r requirements.txt

echo "========================================================"
echo "  Installation Complete! Run ./start-all.sh to launch."
echo "========================================================"
