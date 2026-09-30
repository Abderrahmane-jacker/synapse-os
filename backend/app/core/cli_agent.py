import os
import asyncio
import shlex
import logging
from typing import AsyncGenerator

logger = logging.getLogger(__name__)

class CLIAgent:
    """Executes native CLI commands / subagent invocations (e.g., claude, agy, bash)

    and streams formatted output to the Nexus chat stream.
    """

    CLI_PREFIXES = ("claude", "agy", "/cli", "/agent", "/run", "npx", "python", "python3", "git", "docker", "ollama", "bash", "sh")

    def is_cli_command(self, message: str) -> bool:
        msg = message.strip()
        if any(msg.startswith(prefix) for prefix in self.CLI_PREFIXES):
            return True
        return False

    def clean_command(self, message: str) -> str:
        msg = message.strip()
        for prefix in ("/cli", "/agent", "/run"):
            if msg.startswith(prefix):
                msg = msg[len(prefix):].strip()
        return msg

    async def execute_stream(self, message: str) -> AsyncGenerator[str, None]:
        cmd_str = self.clean_command(message)
        logger.info(f"Executing CLI agent command: {cmd_str}")

        yield f"```bash\n$ {cmd_str}\n"

        try:
            process = await asyncio.create_subprocess_shell(
                cmd_str,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
                cwd=os.getcwd()
            )

            while True:
                line = await process.stdout.readline()
                if not line:
                    break
                decoded = line.decode('utf-8', errors='replace')
                yield decoded

            await process.wait()
            exit_code = process.returncode
            if exit_code == 0:
                yield f"\n# [Command completed successfully with code 0]\n```"
            else:
                yield f"\n# [Command finished with exit code {exit_code}]\n```"

        except Exception as e:
            logger.error(f"Error running CLI command '{cmd_str}': {e}")
            yield f"\n[Execution error: {str(e)}]\n```"

cli_agent = CLIAgent()
