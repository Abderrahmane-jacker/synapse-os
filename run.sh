#!/usr/bin/env bash
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo "=========================================="
echo "          ❖ SynapseOS Platform ❖          "
echo "=========================================="

# Check if user wants docker mode: ./run.sh --docker or ./run.sh -d
if [ "$1" == "--docker" ] || [ "$1" == "-d" ]; then
    echo "[+] Verifying Ollama bridge for Docker..."
    if ! curl -s http://127.0.0.1:53317/api/tags > /dev/null 2>&1; then
        if command -v socat > /dev/null 2>&1; then
            echo "[+] Starting Ollama bridge on port 53317..."
            socat TCP-LISTEN:53317,fork,reuseaddr TCP:127.0.0.1:11434 &
            sleep 1
        fi
    fi
    echo "[+] Launching via Docker Compose..."
    docker compose up --build
    exit 0
fi

# Native local mode
# 1. Check Ollama
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "[+] Starting Ollama server..."
    ollama serve > /dev/null 2>&1 &
    sleep 2
fi

# 2. Check PostgreSQL
if curl -s http://localhost:5432 > /dev/null 2>&1 || pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "[✓] PostgreSQL is running on port 5432."
else
    if command -v docker > /dev/null 2>&1; then
        echo "[+] Attempting to start nexus-db container..."
        docker start nexus-db > /dev/null 2>&1 || docker start nexus-postgres > /dev/null 2>&1 || true
    fi
fi

# 3. Check Backend Venv
if [ ! -d "$BACKEND_DIR/venv" ]; then
    echo "[!] Virtual environment not found at $BACKEND_DIR/venv."
    exit 1
fi

# 4. Start Backend
echo "[+] Starting Backend on http://localhost:8000..."
PYTHONPATH="$BACKEND_DIR" "$BACKEND_DIR/venv/bin/uvicorn" app.main:app --host 0.0.0.0 --port 8000 --app-dir "$BACKEND_DIR" --reload &
BACKEND_PID=$!

# 5. Start Frontend
FRONTEND_PORT=3000
if ss -tulpn | grep -q ":3000 "; then
    FRONTEND_PORT=3001
    echo "[!] Port 3000 is in use, starting Frontend on http://localhost:3001..."
else
    echo "[+] Starting Frontend on http://localhost:3000..."
fi

(cd "$FRONTEND_DIR" && PORT=$FRONTEND_PORT npm run dev -- -p $FRONTEND_PORT) &
FRONTEND_PID=$!

cleanup() {
    echo ""
    echo "[*] Shutting down services..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    wait $BACKEND_PID 2>/dev/null || true
    wait $FRONTEND_PID 2>/dev/null || true
    echo "[*] Services stopped."
}

trap cleanup INT TERM

echo ""
echo "✨ SynapseOS is running!"
echo "   - Frontend: http://localhost:$FRONTEND_PORT"
echo "   - Backend:  http://localhost:8000 (Docs: http://localhost:8000/docs)"
echo "   - Ollama:   http://localhost:11434"
echo ""
echo "Tip: Run './run.sh --docker' anytime to run all services containerized."
echo "Press Ctrl+C to stop all servers."

wait
