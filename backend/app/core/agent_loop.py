import asyncio
import pty
import os
import fcntl
import termios
import struct
import re
import json
import logging
from app.core.agent_sandbox import agent_sandbox

logger = logging.getLogger(__name__)

class AgentSession:
    def __init__(self, command: str, cwd: str):
        self.command = command
        self.cwd = cwd
        self.process = None
        self.master_fd = None
        self.slave_fd = None
        self._running = False
        self.history_buffer = ""
        self.listeners = set()

    async def start(self):
        # Create a PTY
        self.master_fd, self.slave_fd = pty.openpty()

        # Set terminal size to standard 80x24 so lines wrap predictably
        winsize = struct.pack("HHHH", 24, 80, 0, 0)
        fcntl.ioctl(self.master_fd, termios.TIOCSWINSZ, winsize)

        logger.info(f"Starting AgentSession with command: {self.command} in {self.cwd}")

        env = os.environ.copy()
        # Force color and interactive mode
        env["FORCE_COLOR"] = "1"
        env["TERM"] = "xterm-256color"
        
        # Check if command should be wrapped in sandbox
        exec_cmd = self.command
        if agent_sandbox.docker_available:
            sandbox_args = agent_sandbox.wrap_command(self.command, workspace_dir=self.cwd)
            exec_cmd = " ".join(sandbox_args)
            logger.info(f"Sandbox container execution command: {exec_cmd}")

        self.process = await asyncio.create_subprocess_shell(
            exec_cmd,
            stdin=self.slave_fd,
            stdout=self.slave_fd,
            stderr=self.slave_fd,
            cwd=self.cwd,
            env=env,
            preexec_fn=os.setsid # Create new session
        )
        
        # Close slave fd in parent process
        os.close(self.slave_fd)
        
        # Make master_fd non-blocking
        fl = fcntl.fcntl(self.master_fd, fcntl.F_GETFL)
        fcntl.fcntl(self.master_fd, fcntl.F_SETFL, fl | os.O_NONBLOCK)
        
        self._running = True

    async def read_stream(self):
        """Read from the PTY and yield JSON payloads containing text output."""
        loop = asyncio.get_running_loop()
        
        while self._running:
            try:
                # Use executor to read non-blocking fd without blocking event loop
                data = await loop.run_in_executor(None, self._read_nonblocking, 4096)
                if data is None:
                    # No data available right now, sleep and retry
                    await asyncio.sleep(0.05)
                    continue
                if data == b"":
                    # Process died or closed (EOF)
                    break
                
                text = data.decode('utf-8', errors='replace')
                self.history_buffer += text
                if len(self.history_buffer) > 200000:
                    self.history_buffer = self.history_buffer[-200000:]
                
                # Yield text output immediately for xterm.js
                yield json.dumps({
                    "type": "output",
                    "content": text
                })
                    
            except BlockingIOError:
                await asyncio.sleep(0.05)
            except OSError as e:
                # EIO means the PTY was closed (child process exited)
                if e.errno == 5:
                    break
                logger.error(f"PTY read error: {e}")
                break
                
        self._running = False
        yield json.dumps({
            "type": "done",
            "content": "\r\n[Session Finished]\r\n"
        })

    def _read_nonblocking(self, size):
        try:
            return os.read(self.master_fd, size)
        except BlockingIOError:
            return None

    def send_input(self, text: str):
        if not self._running or self.master_fd is None:
            return
        os.write(self.master_fd, text.encode('utf-8'))

    async def stop(self):
        self._running = False
        if self.process:
            try:
                # Terminate the process group
                os.killpg(os.getpgid(self.process.pid), 15)
                await self.process.wait()
            except ProcessLookupError:
                pass
        if self.master_fd is not None:
            try:
                os.close(self.master_fd)
            except OSError:
                pass
