from fastapi import APIRouter, Header, HTTPException
from typing import Optional
from app.core.rag import rag_engine
from app.services.obsidian import obsidian_parser
from app.services.demo_data import get_demo_notes
from app.utils.security import validate_vault_path
from app.config import settings
import os
import re

router = APIRouter()

@router.get("/detect-vaults")
async def detect_vaults():
    """Detect candidate Obsidian vaults on the host / container system."""
    candidates = [
        {"path": "/vault", "name": "Docker Vault Mount (/vault)"},
        {"path": settings.OBSIDIAN_VAULT_PATH, "name": f"Configured Vault ({settings.OBSIDIAN_VAULT_PATH})"} if settings.OBSIDIAN_VAULT_PATH else None,
        {"path": os.path.expanduser("~/Documents/Obsidian"), "name": "Obsidian Documents"},
        {"path": os.path.expanduser("~/Vault"), "name": "Default Vault (~/Vault)"},
    ]
    candidates = [c for c in candidates if c is not None]
    detected = []
    seen = set()
    for item in candidates:
        p = item["path"]
        if not p or p in seen:
            continue
        seen.add(p)
        if os.path.exists(p) and os.path.isdir(p):
            try:
                md_count = sum(len([f for f in files if f.endswith(".md")]) for _, _, files in os.walk(p))
                detected.append({
                    "path": p,
                    "name": item["name"],
                    "note_count": md_count
                })
            except Exception:
                pass
    return {"vaults": detected}

@router.get("/browse-folders")
async def browse_folders(path: Optional[str] = None):
    """Browse directories on the filesystem to allow visual folder navigation without typing."""
    if not path or not path.strip():
        target = "/vault" if os.path.exists("/vault") else os.path.expanduser("~")
    else:
        target = path.strip()

    if not os.path.exists(target):
        if "obsidian" in target.lower() and os.path.exists("/vault"):
            target = "/vault"
        elif target == "/vault" and os.path.exists("/vault"):
            target = "/vault"
        else:
            target = "/"

    if not os.path.isdir(target):
        target = os.path.dirname(target) or "/"

    abs_path = os.path.abspath(target)
    parent_path = os.path.dirname(abs_path) if abs_path != "/" else None

    current_notes = 0
    try:
        current_notes = sum(len([f for f in files if f.endswith(".md")]) for _, _, files in os.walk(abs_path))
    except Exception:
        pass

    subdirs = []
    try:
        entries = sorted(os.listdir(abs_path))
        for entry in entries:
            if entry.startswith(".") or entry in ["node_modules", "__pycache__", "proc", "sys", "dev", "bin", "sbin", "boot"]:
                continue
            child_path = os.path.join(abs_path, entry)
            if os.path.isdir(child_path):
                child_notes = 0
                try:
                    child_notes = sum(len([f for f in files if f.endswith(".md")]) for _, _, files in os.walk(child_path))
                except Exception:
                    pass
                subdirs.append({
                    "name": entry,
                    "path": child_path,
                    "note_count": child_notes,
                    "is_vault": child_notes > 0
                })
    except Exception:
        pass

    shortcuts = [
        {"name": "Docker Vault (/vault)", "path": "/vault", "exists": os.path.exists("/vault")},
        {"name": "Home Documents", "path": os.path.expanduser("~/Documents"), "exists": os.path.exists(os.path.expanduser("~/Documents"))},
        {"name": "Root (/)", "path": "/", "exists": True}
    ]

    return {
        "current_path": abs_path,
        "parent_path": parent_path,
        "name": os.path.basename(abs_path) or abs_path,
        "note_count": current_notes,
        "is_vault": current_notes > 0,
        "shortcuts": [s for s in shortcuts if s["exists"]],
        "directories": subdirs
    }

@router.post("/validate-path")
async def validate_vault_path_endpoint(body: dict):
    """Validate a user-provided vault directory path."""
    raw_path = body.get("path", "").strip()
    if not raw_path:
        return {
            "valid": False,
            "resolved_path": "",
            "note_count": 0,
            "message": "Please specify a directory path."
        }

    target = raw_path
    if not os.path.exists(target):
        if "obsidian" in target.lower() and os.path.exists("/vault"):
            target = "/vault"
        elif target == "/vault" and os.path.exists("/vault"):
            target = "/vault"
        else:
            return {
                "valid": False,
                "resolved_path": raw_path,
                "note_count": 0,
                "message": f"Directory '{raw_path}' not found on filesystem."
            }

    try:
        safe_path = validate_vault_path(target)
        notes = obsidian_parser.scan_vault(safe_path)
        display_name = os.path.basename(raw_path.rstrip("/")) or "Obsidian Vault"
        return {
            "valid": True,
            "resolved_path": raw_path,
            "note_count": len(notes),
            "name": display_name,
            "message": f"Valid Obsidian Vault ({len(notes)} markdown notes found)"
        }
    except Exception as e:
        return {
            "valid": False,
            "resolved_path": raw_path,
            "note_count": 0,
            "message": str(e)
        }

@router.post("/index")
async def index_vault(x_vault_path: str = Header(None)):
    safe_path = validate_vault_path(x_vault_path)
    stats = await rag_engine.index_vault(safe_path)
    return stats

@router.get("/search")
async def search_knowledge(q: str, top_k: int = 5):
    results = await rag_engine.search(q, top_k)
    return {"results": results}

@router.get("/stats")
async def knowledge_stats():
    return await rag_engine.get_stats()

@router.get("/notes")
async def get_notes(skip: int = 0, limit: int = 5000, x_vault_path: str = Header(None)):
    safe_path = validate_vault_path(x_vault_path)
    if not safe_path:
        demo = get_demo_notes()
        return {"total": len(demo), "notes": demo[skip:skip+limit]}
    notes = obsidian_parser.scan_vault(safe_path)
    return {"total": len(notes), "notes": notes[skip:skip+limit]}

@router.get("/graph")
async def get_knowledge_graph(x_vault_path: str = Header(None)):
    safe_path = validate_vault_path(x_vault_path)
    if not safe_path:
        demo_notes = get_demo_notes()
        category_colors = {
            "Architecture": "#0F0F0F",
            "Reconnaissance": "#1E293B",
            "Penetration Testing": "#881337",
            "Web Security": "#1E3A8A",
            "AI Automation": "#80A300",
            "DevSecOps": "#312E81",
            "Router": "#0F0F0F",
            "Wiki": "#1E293B",
            "Concepts": "#80A300",
            "Suites": "#312E81",
            "Skills": "#1E3A8A",
            "Tools": "#881337",
            "Worlds": "#0E7490",
            "Notes": "#27272A",
            "Files": "#3F3F46"
        }
        depth_colors = {
            0: "#0F0F0F",
            1: "#80A300",
            2: "#1E293B",
            3: "#3F3F46",
            4: "#52525B"
        }
        
        links = []
        conn_counts = {}
        all_tags = []
        category_counts = {}

        for n in demo_notes:
            cat = n.get("category", "Architecture")
            category_counts[cat] = category_counts.get(cat, 0) + 1
            all_tags.extend(n.get("tags", []))
            for l in n.get("links", []):
                links.append({"source": n["title"], "target": l})
                conn_counts[n["title"]] = conn_counts.get(n["title"], 0) + 1
                conn_counts[l] = conn_counts.get(l, 0) + 1

        nodes = []
        for idx, n in enumerate(demo_notes):
            cat = n.get("category", "Architecture")
            conns = conn_counts.get(n["title"], len(n.get("links", [])))
            depth = 0 if conns >= 4 else (1 if conns >= 2 else 2)
            nodes.append({
                "id": n["title"],
                "title": n["title"],
                "category": cat,
                "color": category_colors.get(cat, "#0F0F0F"),
                "depth": depth,
                "depth_color": depth_colors.get(depth, "#0F0F0F"),
                "connections": conns,
                "path": n["path"],
                "tags": n.get("tags", []),
                "created": int(n.get("created").timestamp() * 1000) if n.get("created") else 1785400000000,
                "content": n.get("content", "")
            })

        from collections import Counter
        tag_counts = dict(Counter(all_tags).most_common(12))
        top_hubs = [{"name": n["title"], "count": n["connections"]} for n in sorted(nodes, key=lambda x: x["connections"], reverse=True)]

        return {
            "total_notes": len(nodes),
            "total_connections": len(links),
            "nodes": nodes,
            "links": links,
            "constellation_links": [{"source": top_hubs[0]["name"], "target": top_hubs[1]["name"]}] if len(top_hubs) >= 2 else [],
            "top_hubs": top_hubs,
            "category_counts": category_counts,
            "tag_counts": tag_counts,
            "depth_colors": depth_colors
        }
    return obsidian_parser.build_graph_data(safe_path)

@router.post("/notes")
async def create_note(body: dict):
    """Create a new markdown note in the Obsidian vault."""
    import os
    from datetime import datetime

    title = body.get("title", "").strip()
    content = body.get("content", "").strip()
    tags = body.get("tags", [])
    folder = body.get("folder", "").strip()

    if not title:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Title is required")

    # Build frontmatter
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    frontmatter_lines = [
        "---",
        f"created: {now}",
    ]
    if tags:
        frontmatter_lines.append(f"tags: [{', '.join(tags)}]")
    frontmatter_lines.append("---")
    frontmatter_lines.append("")

    # Build body with inline tags
    body_lines = []
    if tags:
        body_lines.append(" ".join([f"#{t}" for t in tags]))
        body_lines.append("")
    body_lines.append(content)

    full_content = "\n".join(frontmatter_lines) + "\n".join(body_lines)

    # Determine file path
    vault = body.get("vault_path") or getattr(router, 'last_vault_path', "")
    safe_path = validate_vault_path(vault)
    if folder:
        target_dir = os.path.join(safe_path, folder)
    else:
        target_dir = vault

    os.makedirs(target_dir, exist_ok=True)

    # Sanitize filename
    safe_title = re.sub(r'[<>:"/\\|?*]', '', title)
    filepath = os.path.join(target_dir, f"{safe_title}.md")

    # Avoid overwriting
    counter = 1
    base = filepath
    while os.path.exists(filepath):
        filepath = base.replace(".md", f" ({counter}).md")
        counter += 1

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(full_content)

    # Re-index vault so new note is immediately searchable via RAG
    try:
        await rag_engine.index_vault()
    except Exception as e:
        pass

    return {"status": "created", "path": filepath, "title": safe_title}

@router.get("/predictions")
async def get_predictions(limit: int = 5, x_vault_path: str = Header(None)):
    safe_path = validate_vault_path(x_vault_path)
    predictions = obsidian_parser.predict_missing_links(safe_path, top_n=limit)
    return {"predictions": predictions}

@router.post("/connect")
async def connect_notes_endpoint(body: dict):
    """Appends a wiki-link between two notes in Obsidian and triggers re-indexing."""
    source_path = body.get("source_path")
    target_title = body.get("target_title")

    if not source_path or not target_title:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="source_path and target_title are required")

    success = obsidian_parser.connect_notes(source_path, target_title)
    if success:
        try:
            await rag_engine.index_vault()
        except Exception:
            pass

    return {"status": "connected" if success else "failed", "success": success}

@router.get("/backlinks")
async def get_backlinks(title: str, x_vault_path: str = Header(None)):
    safe_path = validate_vault_path(x_vault_path)
    return obsidian_parser.get_backlinks(safe_path, title)
