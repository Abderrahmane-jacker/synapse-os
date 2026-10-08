from fastapi import APIRouter, Header
from pydantic import BaseModel
from typing import Optional
import httpx
from app.core.llm import llm_client
from app.services.obsidian import obsidian_parser
from app.services.command_parser import command_parser
from app.services.demo_data import get_demo_notes, get_demo_dashboard
from app.core.rag import rag_engine
from app.utils.security import validate_vault_path
from app.config import settings
from collections import Counter
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/health")
async def health_check():
    return {"status": "ok"}

@router.get("/models")
async def get_models():
    raw = await llm_client.list_models()
    models = [m["name"] if isinstance(m, dict) and "name" in m else str(m) for m in raw]
    return {"models": models}

@router.post("/models/pull")
async def pull_model_endpoint(payload: dict):
    model = payload.get("model")
    host = payload.get("host")
    if not model:
        return {"status": "error", "message": "Model name is required"}
    try:
        res = await llm_client.pull_model(model, host)
        return {"status": "success", "result": res}
    except Exception as e:
        logger.error(f"Failed to pull model '{model}': {e}")
        return {"status": "error", "message": str(e)}

class ActiveModelRequest(BaseModel):
    model: str
    provider: Optional[str] = "ollama"

@router.post("/model/active")
async def set_active_model(req: ActiveModelRequest):
    settings.DEFAULT_LLM_MODEL = req.model.strip()
    return {"status": "success", "active_model": settings.DEFAULT_LLM_MODEL, "provider": req.provider}

@router.get("/status")
async def system_status(x_vault_path: str = Header(None)):
    status_str = await llm_client.get_status()
    try:
        safe_path = validate_vault_path(x_vault_path)
        if safe_path:
            notes = obsidian_parser.scan_vault(safe_path)
        else:
            notes = get_demo_notes()
    except Exception:
        notes = get_demo_notes()
        
    return {
        "ollama_online": status_str == "online",
        "model": settings.DEFAULT_LLM_MODEL,
        "indexed_notes": len(notes),
        "uptime": 100
    }

@router.get("/dashboard")
async def get_dashboard_summary(x_vault_path: str = Header(None)):
    """
    Returns rich dynamic analytics directly from the user's Obsidian vault.
    If no valid vault path is provided (e.g. Guest Demo Mode), returns safe synthetic demo data.
    """
    safe_path = validate_vault_path(x_vault_path)
    status_str = await llm_client.get_status()
    
    if not safe_path:
        return get_demo_dashboard(active_model=settings.DEFAULT_LLM_MODEL, ollama_online=status_str == "online")

    notes = []
    try:
        notes = obsidian_parser.scan_vault(safe_path)
    except Exception as e:
        logger.error(f"Error scanning vault for dashboard: {e}")

    # Vault categories breakdown (PARA structure)
    category_counts = {}
    all_tags = []
    for n in notes:
        cat = n.get("category", "General")
        category_counts[cat] = category_counts.get(cat, 0) + 1
        all_tags.extend(n.get("tags", []))

    top_tags = [
        {"tag": tag, "count": count}
        for tag, count in Counter(all_tags).most_common(12)
    ]

    # Command Arsenal
    commands = []
    if safe_path:
        try:
            commands = command_parser.scan_commands_repository(safe_path)
        except Exception as e:
            logger.error(f"Error scanning commands for dashboard: {e}")

    cat_counts = dict(Counter(c.get("category", "General") for c in commands))

    # Vector RAG stats
    try:
        rag_stats = await rag_engine.get_stats()
    except Exception:
        rag_stats = {"total_chunks": 0, "status": "empty"}

    return {
        "stats": {
            "total_notes": len(notes),
            "total_chunks": rag_stats.get("total_chunks", 0),
            "total_commands": len(commands),
            "total_categories": len(cat_counts),
            "ollama_online": status_str == "online",
            "active_model": settings.DEFAULT_LLM_MODEL,
            "vault_path": safe_path
        },
        "categories": category_counts,
        "command_categories": cat_counts,
        "recent_notes": [
            {
                "title": n.get("title"),
                "category": n.get("category", "General"),
                "folder": n.get("folder", ""),
                "tags": n.get("tags", [])[:4],
                "modified": n.get("modified").isoformat() if n.get("modified") else None,
                "path": n.get("path")
            }
            for n in notes[:8]
        ],
        "top_tags": top_tags,
        "featured_commands": commands[:6]
    }

class SystemSetupRequest(BaseModel):
    vault_path: Optional[str] = "./vault"
    model: Optional[str] = "auto/best-coding"
    provider: Optional[str] = "omniroute"
    operator_name: Optional[str] = "Operator"
    agent_name: Optional[str] = "Synapse"
    omniroute_token: Optional[str] = None
    omniroute_host: Optional[str] = None

@router.post("/setup")
async def setup_system(req: SystemSetupRequest):
    """
    Called during first-run setup wizard or when reconfiguring system settings.
    Updates in-memory settings and scans/indexes the vault.
    """
    import os
    if req.vault_path:
        target = os.path.expanduser(req.vault_path.strip())
        if not os.path.isabs(target):
            if not os.path.exists(target):
                parent_path = os.path.abspath(os.path.join(os.getcwd(), "..", target))
                if os.path.exists(parent_path):
                    target = parent_path
                else:
                    try:
                        os.makedirs(target, exist_ok=True)
                    except Exception:
                        pass
            target = os.path.abspath(target)
        settings.OBSIDIAN_VAULT_PATH = target

    if req.model:
        settings.DEFAULT_LLM_MODEL = req.model.strip()
    if req.provider:
        settings.LLM_PROVIDER = req.provider.strip()
    if req.operator_name:
        settings.OPERATOR_NAME = req.operator_name.strip()
    if req.agent_name:
        settings.AGENT_NAME = req.agent_name.strip()
    if req.omniroute_host:
        settings.OMNIROUTE_BASE_URL = req.omniroute_host.strip()

    note_count = 0
    safe_path = validate_vault_path(settings.OBSIDIAN_VAULT_PATH)
    if safe_path:
        try:
            notes = obsidian_parser.scan_vault(safe_path)
            note_count = len(notes)
            import asyncio
            asyncio.create_task(rag_engine.index_vault(safe_path))
        except Exception as e:
            logger.warning(f"Error scanning vault during setup: {e}")

    # Persist updated configuration to .env files on disk so settings survive server re-runs
    try:
        env_updates = {
            "OBSIDIAN_VAULT_PATH": settings.OBSIDIAN_VAULT_PATH,
            "DEFAULT_LLM_MODEL": settings.DEFAULT_LLM_MODEL,
            "LLM_PROVIDER": getattr(settings, "LLM_PROVIDER", "omniroute"),
            "OPERATOR_NAME": getattr(settings, "OPERATOR_NAME", "Operator"),
            "AGENT_NAME": getattr(settings, "AGENT_NAME", "Synapse"),
        }
        if getattr(settings, "OMNIROUTE_BASE_URL", None):
            env_updates["OMNIROUTE_BASE_URL"] = settings.OMNIROUTE_BASE_URL

        candidate_paths = [
            os.path.abspath(os.path.join(os.getcwd(), ".env")),
            os.path.abspath(os.path.join(os.getcwd(), "..", ".env")),
            os.path.abspath(os.path.join(os.getcwd(), "backend", ".env")),
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env")),
        ]
        written = set()
        for env_file in candidate_paths:
            if env_file in written:
                continue
            written.add(env_file)
            existing_lines = []
            if os.path.exists(env_file):
                try:
                    with open(env_file, "r") as f:
                        existing_lines = f.readlines()
                except Exception:
                    pass
            
            env_map = {}
            for line in existing_lines:
                line_str = line.strip()
                if line_str and not line_str.startswith("#") and "=" in line_str:
                    k, v = line_str.split("=", 1)
                    env_map[k.strip()] = v.strip()

            env_map.update(env_updates)
            try:
                with open(env_file, "w") as f:
                    for k, v in env_map.items():
                        f.write(f"{k}={v}\n")
            except Exception:
                pass
    except Exception as env_err:
        logger.warning(f"Failed to persist .env changes: {env_err}")

    return {
        "status": "success",
        "vault_path": settings.OBSIDIAN_VAULT_PATH,
        "note_count": note_count,
        "model": settings.DEFAULT_LLM_MODEL,
        "provider": getattr(settings, "LLM_PROVIDER", "omniroute"),
        "operator_name": getattr(settings, "OPERATOR_NAME", "Operator"),
        "agent_name": getattr(settings, "AGENT_NAME", "Synapse"),
        "message": f"System configured successfully. Vault: {settings.OBSIDIAN_VAULT_PATH} ({note_count} notes)."
    }

@router.get("/setup-status")
async def get_setup_status():
    safe_path = validate_vault_path(settings.OBSIDIAN_VAULT_PATH)
    note_count = 0
    if safe_path:
        try:
            notes = obsidian_parser.scan_vault(safe_path)
            note_count = len(notes)
        except Exception:
            pass

    return {
        "configured": bool(settings.OBSIDIAN_VAULT_PATH and safe_path),
        "vault_path": settings.OBSIDIAN_VAULT_PATH or "./vault",
        "note_count": note_count,
        "default_model": settings.DEFAULT_LLM_MODEL,
        "provider": getattr(settings, "LLM_PROVIDER", "omniroute"),
        "operator_name": getattr(settings, "OPERATOR_NAME", "Operator"),
        "agent_name": getattr(settings, "AGENT_NAME", "Synapse"),
        "omniroute_url": getattr(settings, "OMNIROUTE_BASE_URL", "http://localhost:20128")
    }
