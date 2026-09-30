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
    Validates and sanitizes the vault path provided via headers.
    If no valid directory path is explicitly specified, returns empty string to trigger Demo Mode.
    Prevents path traversal and access to system-critical directories.
    """
    if not path_str or not isinstance(path_str, str):
        return ""

    target = path_str.strip()
    if not target or target.lower() in ("demo", "null", "undefined", "none"):
        return ""

    # If target doesn't exist on this filesystem, do not expose host directory
    if not os.path.exists(target) or not os.path.isdir(target):
        if target.lower() == "/vault" and os.path.exists("/vault"):
            target = "/vault"
        else:
            return ""

    # Reject relative traversal attacks
    if ".." in target:
        raise HTTPException(status_code=403, detail="Path traversal (..) is strictly forbidden")

    # Resolve to absolute path
    abs_path = os.path.abspath(target)

    # Check against blacklist
    for blocked_dir in SYSTEM_BLACKLIST:
        if abs_path == blocked_dir or abs_path.startswith(blocked_dir + "/"):
            raise HTTPException(status_code=403, detail="Access to system directories is strictly forbidden")

    return abs_path
