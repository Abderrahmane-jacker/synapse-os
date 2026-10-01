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
