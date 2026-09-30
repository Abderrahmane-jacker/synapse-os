import os
import subprocess
import logging
from typing import List

logger = logging.getLogger(__name__)

class AgentSandboxEngine:
    def __init__(self):
        self.docker_available = self._check_docker()

    def _check_docker(self) -> bool:
        """
        Checks if Docker daemon is running and accessible.
        """
        try:
            res = subprocess.run(["docker", "info"], capture_output=True, text=True, timeout=3)
            return res.returncode == 0
        except Exception:
            return False

    def wrap_command(self, cmd: str, tenant_id: str = "default", workspace_dir: str = "/tmp/synapse_workspace") -> List[str]:
        """
        Wraps command inside an isolated ephemeral Docker container if Docker is running.
        Falls back to standard bash execution if Docker is unavailable.
        """
        os.makedirs(workspace_dir, exist_ok=True)

        if self.docker_available:
            logger.info(f"Wrapping command in ephemeral Docker sandbox for tenant {tenant_id}...")
            container_name = f"synapse_sandbox_{tenant_id[:8]}"
            return [
                "docker", "run", "--rm", "-i", "-t",
                "--name", container_name,
                "-v", f"{workspace_dir}:/workspace",
                "-w", "/workspace",
                "alpine:latest",
                "sh", "-c", cmd
            ]
        else:
            logger.info("Docker daemon not detected. Using direct system bash execution.")
            return ["bash", "-c", cmd]

agent_sandbox = AgentSandboxEngine()
