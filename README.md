# SynapseOS — Neural Second Brain & Autonomous Operator Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-0F0F0F?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Ollama](https://img.shields.io/badge/Ollama-Local_First-D0FF14?style=flat-square&color=0F0F0F&labelColor=D0FF14)](https://ollama.com)

**SynapseOS** is a high-performance, brutalist AI Second Brain and autonomous command center built for knowledge workers, cybersecurity operators, and researchers. It bridges your Obsidian markdown vault directly into an interactive 3D semantic graph with pgvector RAG, local LLM intelligence via Ollama, real-time audio voice telemetry, and system terminal command agents.

---

## ⚡ Quick Start (Run Locally in 60 Seconds)

### Method 1: Docker Compose (Recommended)

1. **Clone & Configure**:
   ```bash
   git clone https://github.com/Abderrahmane-jacker/SynapseOS.git
   cd SynapseOS
   cp .env.example .env
   ```

2. **Set Your Vault Path in `.env`**:
   ```ini
   # Point to your local Obsidian notes directory on your host machine
   LOCAL_VAULT_PATH=/home/username/Documents/ObsidianVault
   OLLAMA_BASE_URL=http://host.docker.internal:11434
   DEFAULT_LLM_MODEL=deepseek-r1:8b
   ```

3. **Start SynapseOS**:
   ```bash
   docker compose up -d --build
   ```

4. Open **[http://localhost:3000](http://localhost:3000)**.

---

### Method 2: Bare-Metal Setup (Native Linux / macOS / WSL)

If you prefer running without Docker, use the automated unified runner:

```bash
git clone https://github.com/Abderrahmane-jacker/SynapseOS.git
cd SynapseOS
chmod +x run.sh
./run.sh
```

`run.sh` automatically:
- Creates a Python virtual environment and installs all dependencies
- Installs frontend packages
- Initializes SQLite database
- Starts the FastAPI backend (port 8000) and Next.js frontend (port 3000)

---

## 🎯 Core Features

- **3D Knowledge Force Graph**: Hardware-accelerated Three.js force-directed graph with category filtering, node clustering, and spatial note navigation.
- **RAG Semantic Search & Linking**: Dense neural retrieval with `sentence-transformers` and pgvector HNSW indexing over markdown vaults.
- **Native Local Vault Integration**: Directly mounts and indexes your local notes folder. Zero cloud sync required.
- **Universal LLM Engine**: Seamless integration with local Ollama (`localhost:11434`), plus optional BYOK support for Claude, OpenAI, and Google Gemini.
- **Autonomous Terminal Subagents**: Execute system commands, security diagnostics, and Claude Code CLI tasks directly from the HUD.
- **High-Contrast Brutalist Aesthetic**: Clean anti-slop interface designed for speed, clarity, and zero cognitive bloat.

---

## 📁 Repository Structure

```
├── backend/                  # FastAPI Python Service
│   ├── app/
│   │   ├── api/routes/       # REST endpoints (vault, chat, knowledge, system)
│   │   ├── core/             # LLM orchestration, RAG engine, Agent runners
│   │   ├── models/           # SQLite / PostgreSQL pgvector database schemas
│   │   └── services/         # Obsidian parsing, embeddings, vault sync
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                 # Next.js 15 App Router Frontend
│   ├── src/
│   │   ├── app/              # Routes: /dashboard, /knowledge, /settings, /commands
│   │   ├── components/       # 3D Graph, HUD Gauge, Inspector Sidebar, Vault Modals
│   │   ├── hooks/            # useChat, useAudio
│   │   └── lib/              # API client and WebSocket streaming
│   └── Dockerfile
├── docker-compose.yml        # Multi-container orchestration (DB, API, UI)
├── run.sh                    # Unified bare-metal runner
├── INSTALL.md                # Detailed installation & troubleshooting guide
└── .env.example              # Environment variables template
```

---

## 📖 Documentation

For detailed guides on GPU acceleration, remote Ollama setups, and configuration options, see **[INSTALL.md](INSTALL.md)**.

---

## 📜 License

MIT License. Designed and built for open-source technical excellence.
