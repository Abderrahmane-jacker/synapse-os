# SynapseOS Self-Hosting & Deployment Guide

SynapseOS is designed as a dual-mode platform:
1. **Local / Self-Hosted Mode**: 100% private, runs directly on your hardware via Docker or bare-metal script, indexing local Obsidian folders with local Ollama LLMs.
2. **Cloud Web SaaS Mode**: Zero-install browser experience where users create accounts, drag-and-drop their Obsidian `.zip` archives, and supply their own API keys (BYOK) or tunnels.

---

## ⚡ Method 1: Docker Compose (Recommended)

Docker provides an isolated pgvector database, Python RAG backend, and Next.js frontend with zero host pollution.

### 1. Clone Repository & Setup Environment
```bash
git clone https://github.com/Abderrahmane-jacker/SynapseOS.git
cd SynapseOS
cp .env.example .env
```

### 2. Configure Your Vault Path in `.env`
Open `.env` and set `LOCAL_VAULT_PATH` to the absolute path of your Obsidian vault on your host machine:
```ini
# Linux / macOS
LOCAL_VAULT_PATH=/home/username/Documents/ObsidianVault

# Windows (WSL2)
LOCAL_VAULT_PATH=/mnt/c/Users/username/Documents/ObsidianVault
```

### 3. Ensure Local Ollama is Accessible
If running Ollama locally on your host machine:
- Make sure Ollama is listening on all interfaces or allowing Docker bridge connections:
  ```bash
  # Linux systemd (/etc/systemd/system/ollama.service.d/override.conf)
  [Service]
  Environment="OLLAMA_HOST=0.0.0.0:11434"
  ```
- Pull your preferred model:
  ```bash
  ollama pull gemma4:31b-cloud
  # or
  ollama pull llama3:70b
  ```

### 4. Launch SynapseOS
```bash
docker compose up -d --build
```

- **Web UI**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **pgvector Database**: `localhost:5432`

---

## 🛠️ Method 2: Bare-Metal Setup (Native Linux / macOS / WSL)

If you prefer running without Docker, SynapseOS includes an automated unified runner script that manages both backend and frontend processes.

### Prerequisites
- Python 3.10+ (with `venv`)
- Node.js 18+ and `npm`
- (Optional) [Ollama](https://ollama.com/) running on `localhost:11434`

### 1. One-Line Launch
```bash
chmod +x run.sh
./run.sh
```
`run.sh` automatically:
- Creates a Python virtual environment (`backend/venv`)
- Installs all Python dependencies via `uv` or `pip`
- Installs all frontend npm packages
- Initializes the SQLite database schema
- Starts FastAPI backend on port 8000 and Next.js frontend on port 3000

---

## ☁️ Method 3: Web Sandbox & Cloud SaaS Mode

If you are using the public web deployment of SynapseOS:

1. **Sign Up / Login**: Create a private encrypted account in the web app.
2. **Compress Your Vault**:
   - In your computer's file explorer, right-click your Obsidian vault directory.
   - Click **Compress / Send to ZIP**.
3. **Upload Vault**:
   - In the onboarding modal or **Settings → Obsidian Vault**, drag and drop your `.zip` archive.
   - SynapseOS will securely unpack your markdown files into an isolated sandbox and build an embedding graph.
4. **Configure AI Provider (BYOK)**:
   - Go to **Settings → LLM Engine**.
   - Select your provider:
     - **Google Gemini**: Free tier available instantly via Google AI Studio.
     - **Anthropic Claude**: Enter your Claude API key for Sonnet 3.5 / Opus.
     - **OpenAI**: Enter your OpenAI API key for GPT-4o.
     - **OpenRouter**: Unified access to DeepSeek R1, Llama 3.3, and more.
     - **Remote Ollama**: Expose your local Ollama via Cloudflare Tunnel or ngrok (`https://my-ollama.example.com`).

---

## 🔧 Configuration Reference (`.env`)

| Variable | Default | Description |
|---|---|---|
| `LOCAL_VAULT_PATH` | `./vault` | Host path to your markdown notes directory |
| `OLLAMA_BASE_URL` | `http://host.docker.internal:11434` | Endpoint for Ollama LLM queries |
| `DEFAULT_LLM_MODEL` | `gemma4:31b-cloud` | Default model tag to execute |
| `DATABASE_BACKEND` | `postgres` (or `sqlite`) | Database engine used for RAG & users |
| `POSTGRES_USER` | `postgres` | Database username |
| `POSTGRES_PASSWORD` | `postgres` | Database password |
| `PORT` | `3000` | Frontend web interface port |
| `NEXT_PUBLIC_API_URL`| `http://localhost:8000` | Backend API endpoint |

---

## ❓ Troubleshooting

### Ollama says "Connection refused" inside Docker
Ensure Docker can resolve your host machine. `docker-compose.yml` includes `host.docker.internal:host-gateway`. On Linux, ensure `OLLAMA_HOST=0.0.0.0:11434` is configured on the host system.

### RAG Vector Indexing Takes Time
On initial mount, SynapseOS computes dense embeddings for all markdown files using `sentence-transformers/all-MiniLM-L6-v2`. If you have a GPU (NVIDIA CUDA), it is automatically utilized. On CPU, large vaults (10,000+ notes) will index in the background while the UI remains fully responsive.
