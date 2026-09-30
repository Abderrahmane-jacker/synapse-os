import os
import subprocess
import logging
import httpx
from typing import Optional

logger = logging.getLogger(__name__)

class GitHubSyncManager:
    def sync_vault_from_github(self, repo_url: str, token: Optional[str], local_path: str) -> dict:
        """
        Clones or pulls the latest markdown notes from a user's GitHub repository into local_path.
        Supports private repositories via Personal Access Tokens.
        """
        if not repo_url or not local_path:
            return {"status": "error", "message": "Missing repository URL or local destination path."}

        # Format URL with token for authenticated access to private repos if provided
        auth_url = repo_url
        if token and token.strip() and "github.com" in repo_url:
            clean_token = token.strip()
            # Replace https://github.com/ with https://x-access-token:TOKEN@github.com/
            if repo_url.startswith("https://"):
                auth_url = repo_url.replace("https://", f"https://x-access-token:{clean_token}@")
            elif not repo_url.startswith("http"):
                auth_url = f"https://x-access-token:{clean_token}@github.com/{repo_url.lstrip('/')}"

        os.makedirs(local_path, exist_ok=True)
        git_dir = os.path.join(local_path, ".git")

        try:
            if os.path.exists(git_dir):
                # Repository already cloned, run git pull
                logger.info(f"Pulling latest vault changes from GitHub into {local_path}...")
                res = subprocess.run(
                    ["git", "pull", "--rebase", auth_url, "HEAD"],
                    cwd=local_path,
                    capture_output=True,
                    text=True,
                    timeout=60
                )
                if res.returncode == 0:
                    logger.info("Git pull successful.")
                    return {"status": "success", "message": "Vault successfully synced from GitHub.", "output": res.stdout}
                else:
                    logger.warning(f"Git pull failed: {res.stderr}")
                    return {"status": "error", "message": f"Git pull failed: {res.stderr}"}
            else:
                # Clone fresh repository into destination
                logger.info(f"Cloning vault repository from {repo_url} into {local_path}...")
                res = subprocess.run(
                    ["git", "clone", auth_url, "."],
                    cwd=local_path,
                    capture_output=True,
                    text=True,
                    timeout=120
                )
                if res.returncode == 0:
                    logger.info("Git clone successful.")
                    return {"status": "success", "message": "Vault successfully cloned from GitHub.", "output": res.stdout}
                else:
                    logger.warning(f"Git clone failed: {res.stderr}")
                    return {"status": "error", "message": f"Git clone failed: {res.stderr}"}

        except Exception as e:
            logger.error(f"GitHub Sync Error: {e}")
            return {"status": "error", "message": str(e)}

github_sync_manager = GitHubSyncManager()
