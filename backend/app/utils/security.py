import os
from fastapi import HTTPException
from app.config import settings

# Blacklist of critical system directories to reject completely
SYSTEM_BLACKLIST = [
    "/etc", "/bin", "/sbin", "/usr/bin", "/usr/sbin",
    "/var", "/sys", "/proc", "/dev", "/boot", "/root"
]

def validate_vault_path(path_str: str = None) -> str:
    """
    Validates and sanitizes the vault path provided via headers or settings.
    If no valid directory path is explicitly specified, falls back to settings or ./vault.
    Prevents path traversal into system-critical directories.
    """
    raw = (path_str or "").strip()
    if not raw or raw.lower() in ("demo", "null", "undefined", "none"):
        raw = settings.OBSIDIAN_VAULT_PATH or "./vault"

    # Expand user home tilde
    target = os.path.expanduser(raw.strip())

    # Resolve relative paths (e.g. ./vault or vault)
    if not os.path.isabs(target):
        if os.path.exists(target) and os.path.isdir(target):
            target = os.path.abspath(target)
        else:
            # Check relative to parent directory (e.g. when CWD is backend/)
            parent_rel = os.path.abspath(os.path.join(os.getcwd(), "..", target))
            if os.path.exists(parent_rel) and os.path.isdir(parent_rel):
                target = parent_rel
            elif target.endswith("vault"):
                # Automatically initialize vault directory if requested
                try:
                    os.makedirs(target, exist_ok=True)
                    target = os.path.abspath(target)
                except Exception:
                    pass

    # Docker / containerized fallback
    if (not os.path.exists(target) or not os.path.isdir(target)) and os.path.exists("/vault"):
        target = "/vault"

    if not os.path.exists(target) or not os.path.isdir(target):
        return ""

    abs_path = os.path.abspath(target)

    # Check against blacklist
    for blocked_dir in SYSTEM_BLACKLIST:
        if abs_path == blocked_dir or abs_path.startswith(blocked_dir + "/"):
            raise HTTPException(status_code=403, detail="Access to system directories is strictly forbidden")

    return abs_path
