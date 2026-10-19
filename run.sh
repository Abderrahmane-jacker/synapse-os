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
# 0. Ensure environment configuration and vault storage exist
if [ ! -f "$PROJECT_ROOT/.env" ] && [ -f "$PROJECT_ROOT/.env.example" ]; then
    echo "[+] Initializing root .env from .env.example..."
    cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
fi

if [ ! -f "$BACKEND_DIR/.env" ] && [ -f "$PROJECT_ROOT/.env.example" ]; then
    echo "[+] Initializing backend/.env from .env.example..."
    cp "$PROJECT_ROOT/.env.example" "$BACKEND_DIR/.env"
fi

mkdir -p "$PROJECT_ROOT/vault"
mkdir -p "$PROJECT_ROOT/data/vaults"
mkdir -p "$PROJECT_ROOT/chroma_data"

# 1. Check Ollama
if ! command -v ollama > /dev/null 2>&1; then
    echo "[!] WARNING: 'ollama' is not installed on this machine."
    echo "    To run local models, install Ollama: curl -fsSL https://ollama.com/install.sh | sh"
    echo "    (Or use cloud models via OpenAI/Anthropic/Gemini/OmniRoute in Settings)"
elif ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "[+] Starting local Ollama server..."
    ollama serve > /dev/null 2>&1 &
    sleep 2
else
    echo "[✓] Ollama is running on http://localhost:11434"
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
if [ ! -f "$BACKEND_DIR/venv/bin/uvicorn" ]; then
    echo "[+] Setting up backend virtual environment at $BACKEND_DIR/venv..."
    rm -rf "$BACKEND_DIR/venv"
    if command -v uv > /dev/null 2>&1; then
        echo "[+] Using uv for fast Python environment setup..."
        uv venv --python 3.11 "$BACKEND_DIR/venv" || uv venv "$BACKEND_DIR/venv"
        uv pip install -r "$BACKEND_DIR/requirements.txt" --python "$BACKEND_DIR/venv/bin/python"
    else
        python3 -m venv "$BACKEND_DIR/venv"
        "$BACKEND_DIR/venv/bin/pip" install --upgrade pip
        "$BACKEND_DIR/venv/bin/pip" install -r "$BACKEND_DIR/requirements.txt"
    fi
fi

# 4. Check Frontend Dependencies
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo "[+] Installing frontend node dependencies..."
    (cd "$FRONTEND_DIR" && npm install)
fi

# 5. Start Backend
BACKEND_PID=""
if curl -s http://localhost:8000/api/system/status > /dev/null 2>&1; then
    echo "[✓] Backend is already running on http://localhost:8000."
else
    echo "[+] Starting Backend on http://localhost:8000..."
    PYTHONPATH="$BACKEND_DIR" "$BACKEND_DIR/venv/bin/uvicorn" app.main:app --host 0.0.0.0 --port 8000 --app-dir "$BACKEND_DIR" --reload &
    BACKEND_PID=$!

    # Quick health check: verify backend process didn't die immediately
    sleep 2
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo "[!] ERROR: Backend failed to start on port 8000! Check backend logs above."
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
fi

# 6. Start Frontend
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
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
        wait $BACKEND_PID 2>/dev/null || true
    fi
    kill $FRONTEND_PID 2>/dev/null || true
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
