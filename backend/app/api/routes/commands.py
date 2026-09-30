import os
import re
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.services.command_parser import command_parser
from app.services.demo_data import get_demo_commands
from app.utils.security import validate_vault_path
from app.config import settings
from collections import Counter
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

class AddCommandRequest(BaseModel):
    category: str
    title: str
    command: str
    description: Optional[str] = ""
    tags: Optional[List[str]] = []

@router.get("")
async def get_commands(x_vault_path: str = Header(None)):
    """
    Returns all commands extracted from the user's Commands Repository folder.
    Returns synthetic demo commands if in Guest / Demo mode.
    """
    try:
        safe_path = validate_vault_path(x_vault_path)
        if not safe_path:
            commands = get_demo_commands()
        else:
            commands = command_parser.scan_commands_repository(safe_path)
        
        # Extract unique categories and tags
        categories = list(set(c["category"] for c in commands))
        all_tags = []
        for c in commands:
            all_tags.extend(c.get("tags", []))
        tags_counts = dict(Counter(all_tags))

        return {
            "total": len(commands),
            "categories": categories,
            "tags": tags_counts,
            "commands": commands
        }
    except Exception as e:
        logger.error(f"Error scanning commands repository: {e}")
        return {"total": 0, "categories": [], "tags": {}, "commands": [], "error": str(e)}

@router.get("/categories")
async def get_command_categories(x_vault_path: str = Header(None)):
    """
    Returns categories breakdown with command counts.
    """
    try:
        safe_path = validate_vault_path(x_vault_path)
        if not safe_path:
            commands = get_demo_commands()
        else:
            commands = command_parser.scan_commands_repository(safe_path)
        cat_counts = dict(Counter(c["category"] for c in commands))
        return {"categories": cat_counts}
    except Exception as e:
        logger.error(f"Error fetching command categories: {e}")
        return {"categories": {}}

@router.post("/add")
async def add_command(req: AddCommandRequest, x_vault_path: str = Header(None)):
    """
    Adds a new command to the Commands Repository in Obsidian Vault.
    If the Commands Repository folder or target category markdown file doesn't exist, it creates them.
    """
    try:
        safe_path = validate_vault_path(x_vault_path)
        if not safe_path or not os.path.exists(safe_path):
            safe_path = settings.OBSIDIAN_VAULT_PATH
            os.makedirs(safe_path, exist_ok=True)

        # Locate or create Commands Repository folder
        target_dir = None
        for root, dirs, _ in os.walk(safe_path):
            for d in dirs:
                if 'commands repository' in d.lower() or 'command repository' in d.lower():
                    target_dir = os.path.join(root, d)
                    break
            if target_dir:
                break

        if not target_dir:
            target_dir = os.path.join(safe_path, "Commands Repository")
            os.makedirs(target_dir, exist_ok=True)

        # Sanitize category filename
        clean_cat = req.category.strip() if req.category and req.category.strip() else "General Commands"
        safe_cat_filename = re.sub(r'[^a-zA-Z0-9_\-\s]', '', clean_cat).strip() or "General Commands"
        cat_file_path = os.path.join(target_dir, f"{safe_cat_filename}.md")

        file_exists = os.path.exists(cat_file_path)

        md_block = ""
        if not file_exists:
            md_block += f"# {clean_cat}\n\n"

        md_block += f"## {req.title.strip()}\n"
        if req.description and req.description.strip():
            md_block += f"{req.description.strip()}\n\n"
        
        md_block += "```bash\n"
        md_block += f"{req.command.strip()}\n"
        md_block += "```\n\n"

        with open(cat_file_path, "a", encoding="utf-8") as f:
            f.write(md_block)

        logger.info(f"Command '{req.title}' appended to '{cat_file_path}'")
        
        return {
            "status": "success",
            "message": f"Command added to category '{clean_cat}' in file '{safe_cat_filename}.md'",
            "category": clean_cat,
            "title": req.title.strip(),
            "file": cat_file_path
        }
    except Exception as e:
        logger.error(f"Error adding command: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save command: {str(e)}")
