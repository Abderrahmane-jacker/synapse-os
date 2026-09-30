import os
import io
import shutil
import uuid
import zipfile
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Header, UploadFile, File
from pydantic import BaseModel

from app.services.github_sync import github_sync_manager
from app.services.obsidian import obsidian_service
from app.utils.security import validate_vault_path
from app.core.security import decode_access_token
from app.models.database import db_manager
from app.core.rag import rag_engine

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_EXTENSIONS = {
    ".md", ".markdown", ".canvas", ".txt", ".json",
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp",
    ".bmp", ".tiff", ".pdf", ".mp3", ".wav", ".m4a"
}

IGNORED_DIRS = {"__macosx", ".git", ".obsidian", ".trash", "node_modules", ".vscode"}

class SyncRequest(BaseModel):
    repo_url: str
    token: Optional[str] = ""
    vault_path: Optional[str] = None

@router.post("/upload-zip")
async def upload_vault_zip(
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None)
):
    """
    Accepts an Obsidian vault packaged as a .zip file, validates and safely unpacks it
    into an isolated, per-user storage sandbox, and indexes the notes immediately.
    """
    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a .zip archive.")

    # Determine user identity or assign anonymous guest sandbox
    user_id = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        payload = decode_access_token(token)
        if payload and "sub" in payload:
            user_id = payload["sub"]

    if not user_id:
        user_id = f"guest_{uuid.uuid4().hex[:10]}"

    # Destination directory: data/vaults/{user_id}
    base_dir = os.path.abspath(os.path.join(os.getcwd(), "data", "vaults"))
    user_vault_dir = os.path.join(base_dir, user_id)
    os.makedirs(user_vault_dir, exist_ok=True)

    try:
        content = await file.read()
        if len(content) > 100 * 1024 * 1024:  # 100MB limit
            raise HTTPException(status_code=400, detail="Vault zip exceeds 100MB size limit.")

        with zipfile.ZipFile(io.BytesIO(content)) as zf:
            for member in zf.infolist():
                if member.is_dir():
                    continue

                filename = member.filename
                # Prevent path traversal
                if filename.startswith("/") or ".." in filename or "\\" in filename:
                    continue

                # Filter out OS metadata and junk folders
                parts = filename.split("/")
                if any(p.lower() in IGNORED_DIRS for p in parts):
                    continue

                # Verify file extension is safe & allowed
                _, ext = os.path.splitext(filename)
                if ext.lower() not in ALLOWED_EXTENSIONS:
                    continue

                dest_path = os.path.abspath(os.path.join(user_vault_dir, filename))
                if not dest_path.startswith(user_vault_dir):
                    continue

                os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                with zf.open(member) as source, open(dest_path, "wb") as target:
                    shutil.copyfileobj(source, target)

    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Invalid or corrupted zip archive.")
    except Exception as e:
        logger.error(f"Error extracting vault zip: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to extract zip archive: {str(e)}")

    # Detect if notes were wrapped inside a single root folder (e.g. MyVault/Note.md)
    active_vault_path = user_vault_dir
    sub_entries = [os.path.join(user_vault_dir, e) for e in os.listdir(user_vault_dir) if not e.startswith(".")]
    if len(sub_entries) == 1 and os.path.isdir(sub_entries[0]):
        active_vault_path = sub_entries[0]

    # Scan the extracted vault
    notes = obsidian_service.scan_vault(active_vault_path)
    note_count = len(notes)

    # Save to user's database record if authenticated
    if user_id and not user_id.startswith("guest_"):
        try:
            await db_manager.update_user_vault_path(user_id, active_vault_path)
        except Exception as e:
            logger.warning(f"Could not persist vault_path to user profile: {e}")

    # Immediately index notes into vector database for search & 3D graph
    try:
        await rag_engine.index_vault(active_vault_path)
    except Exception as e:
        logger.warning(f"RAG indexing warning for uploaded vault: {e}")

    return {
        "status": "success",
        "vault_path": active_vault_path,
        "note_count": note_count,
        "message": f"Successfully extracted and mounted vault ({note_count} markdown notes indexed)."
    }

@router.post("/github-sync")
async def sync_github_vault(req: SyncRequest, x_vault_path: Optional[str] = Header(None)):
    target_path = validate_vault_path(req.vault_path or x_vault_path)
    if not target_path:
        raise HTTPException(status_code=400, detail="A valid, authenticated vault path is required to sync.")
    
    result = github_sync_manager.sync_vault_from_github(
        repo_url=req.repo_url,
        token=req.token,
        local_path=target_path
    )

    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("message"))

    # Trigger re-index of vault after sync
    try:
        obsidian_service.scan_vault(target_path)
        await rag_engine.index_vault(target_path)
    except Exception:
        pass

    return {
        "status": "success",
        "message": result.get("message"),
        "output": result.get("output")
    }

@router.post("/github-webhook")
async def github_webhook_auto_pull(x_vault_path: Optional[str] = Header(None)):
    """
    GitHub Webhook target endpoint: Automatically called when user pushes notes to GitHub.
    """
    target_path = validate_vault_path(x_vault_path)
    if not target_path:
        raise HTTPException(status_code=400, detail="Valid vault path required")
    result = github_sync_manager.sync_vault_from_github(
        repo_url="", # uses existing origin in local repo
        token="",
        local_path=target_path
    )
    return result
