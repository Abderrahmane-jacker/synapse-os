import os
import sqlite3
import httpx
import json
import logging
from typing import AsyncGenerator, Optional
from app.config import settings

logger = logging.getLogger(__name__)

class LLMClient:
    def __init__(self):
        self.ollama_url = f"{settings.OLLAMA_BASE_URL}/api"

    @staticmethod
    def _get_omniroute_active_key() -> Optional[str]:
        sqlite_path = os.path.expanduser("~/.omniroute/storage.sqlite")
        if not os.path.exists(sqlite_path):
            return None
        try:
            conn = sqlite3.connect(f"file:{sqlite_path}?mode=ro", uri=True)
            cursor = conn.cursor()
            cursor.execute("SELECT key FROM api_keys WHERE is_active=1 LIMIT 1")
            row = cursor.fetchone()
            conn.close()
            if row and row[0]:
                return row[0]
        except Exception as e:
            logger.warning(f"Could not read OmniRoute key from sqlite: {e}")
        return None

    async def chat(
        self, 
        messages: list, 
        model: str = None, 
        provider: str = "ollama", 
        api_key: str = None, 
        ollama_host: str = None,
        omniroute_host: str = None,
        stream: bool = True
    ) -> AsyncGenerator[str, None]:
        model = (model or settings.DEFAULT_LLM_MODEL or "").strip()
        provider = (provider or "ollama").lower()

        if not model:
            yield "⚠️ **Model Not Configured**: Please enter a model identifier in Settings (e.g. `deepseek-r1:8b`, `claude-3-7-sonnet`, `gpt-4o`, `auto/best-coding`) before sending messages."
            return

        try:
            if provider == "gemini":
                async for chunk in self._chat_gemini(messages, model, api_key):
                    yield chunk
            elif provider == "anthropic":
                async for chunk in self._chat_anthropic(messages, model, api_key):
                    yield chunk
            elif provider == "openai":
                async for chunk in self._chat_openai(messages, model, api_key):
                    yield chunk
            elif provider == "openrouter":
                async for chunk in self._chat_openrouter(messages, model, api_key):
                    yield chunk
            elif provider == "omniroute":
                target_omniroute_host = omniroute_host or (ollama_host if (ollama_host and ":20128" in ollama_host) else "http://localhost:20128")
                async for chunk in self._chat_omniroute(messages, model, api_key, target_omniroute_host):
                    yield chunk
            else:
                async for chunk in self._chat_ollama(messages, model, ollama_host or settings.OLLAMA_BASE_URL, stream):
                    yield chunk
        except Exception as e:
            logger.error(f"LLM execution failed for provider '{provider}', model '{model}': {e}")
            err_msg = str(e)
            if "401" in err_msg or "Unauthorized" in err_msg:
                yield (
                    "### 🔒 AI Provider Authentication Required (401 Unauthorized)\n\n"
                    f"The connection to `{provider}` (`{model}`) was rejected with HTTP 401 Unauthorized.\n\n"
                    "**To resolve this:**\n"
                    "1. **Switch to Google Gemini (Free)**: Go to **Settings** in the bottom left, select **Google Gemini**, and provide your free Gemini API key from [Google AI Studio](https://aistudio.google.com/).\n"
                    "2. **OmniRoute (Local Proxy)**: Check that your OmniRoute server is running (`http://localhost:20128`) and that a valid API key is set in Settings or active in `~/.omniroute/storage.sqlite`.\n"
                    "3. **Verify Local Ollama**: If you are using local Ollama, confirm the host is reachable without proxy authorization (e.g. `http://127.0.0.1:11434`), or run `ollama serve`.\n"
                    "4. **Configured API Key**: If using OpenAI, Anthropic, or OpenRouter, double-check your API key in **Settings**."
                )
            else:
                yield f"Error communicating with AI Provider '{provider}' (Model: '{model}').\nDetails: {err_msg}"

    async def _chat_gemini(self, messages: list, model: str, api_key: Optional[str]) -> AsyncGenerator[str, None]:
        if not api_key:
            yield "⚠️ Google Gemini API key is missing. Please enter your Gemini API key in Settings → LLM & AI Model Integration Matrix."
            return

        clean_model = model.replace("models/", "").strip() if model else "gemini-2.5-flash"

        contents = []
        system_instruction = None
        for m in messages:
            role = m.get("role", "user")
            content = m.get("content", "")
            if not content:
                continue
            if role == "system":
                system_instruction = {"parts": [{"text": content}]}
            else:
                g_role = "model" if role == "assistant" else "user"
                contents.append({"role": g_role, "parts": [{"text": content}]})

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{clean_model}:streamGenerateContent?alt=sse&key={api_key}"
        payload = {"contents": contents}
        if system_instruction:
            payload["systemInstruction"] = system_instruction

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", url, json=payload) as response:
                if response.status_code != 200:
                    err_body = await response.aread()
                    err_str = err_body.decode(errors="ignore")
                    logger.error(f"Gemini API Error {response.status_code}: {err_str}")
                    raise Exception(f"Gemini API returned status {response.status_code}: {err_str}")

                async for line in response.aiter_lines():
                    if line.startswith("data:"):
                        raw = line[5:].strip()
                        if not raw or raw == "[DONE]":
                            continue
                        try:
                            data = json.loads(raw)
                            candidates = data.get("candidates", [])
                            if candidates:
                                parts = candidates[0].get("content", {}).get("parts", [])
                                for p in parts:
                                    if "text" in p and p["text"]:
                                        yield p["text"]
                        except Exception as e:
                            logger.error(f"Gemini SSE parse error: {e}")

    async def _chat_anthropic(self, messages: list, model: str, api_key: Optional[str]) -> AsyncGenerator[str, None]:
        if not api_key:
            yield "⚠️ Anthropic API key is missing. Please enter your Anthropic API key in Settings → LLM & AI Model Integration Matrix."
            return

        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        
        system_prompt = ""
        claude_messages = []
        for m in messages:
            if m.get("role") == "system":
                system_prompt += m.get("content", "") + "\n"
            else:
                c_role = "assistant" if m.get("role") == "assistant" else "user"
                claude_messages.append({"role": c_role, "content": m.get("content", "")})

        payload = {
            "model": model,
            "max_tokens": 4096,
            "messages": claude_messages,
            "stream": True
        }
        if system_prompt.strip():
            payload["system"] = system_prompt.strip()

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", "https://api.anthropic.com/v1/messages", headers=headers, json=payload) as response:
                if response.status_code != 200:
                    err_body = await response.aread()
                    raise Exception(f"Anthropic API returned status {response.status_code}: {err_body.decode()}")
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        raw = line[6:].strip()
                        try:
                            data = json.loads(raw)
                            if data.get("type") == "content_block_delta":
                                delta = data.get("delta", {})
                                if delta.get("type") == "text_delta":
                                    yield delta.get("text", "")
                                elif delta.get("type") == "thinking_delta":
                                    yield delta.get("thinking", "")
                                elif "text" in delta:
                                    yield delta["text"]
                        except Exception:
                            pass

    async def _chat_openai(self, messages: list, model: str, api_key: Optional[str]) -> AsyncGenerator[str, None]:
        if not api_key:
            yield "⚠️ OpenAI API key is missing. Please enter your OpenAI API key in Settings → LLM & AI Model Integration Matrix."
            return

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        formatted_messages = []
        is_reasoning_model = model.startswith("o1") or model.startswith("o3")
        for m in messages:
            msg_copy = dict(m)
            if is_reasoning_model and msg_copy.get("role") == "system":
                msg_copy["role"] = "developer"
            formatted_messages.append(msg_copy)

        payload = {
            "model": model,
            "messages": formatted_messages,
            "stream": True
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", "https://api.openai.com/v1/chat/completions", headers=headers, json=payload) as response:
                if response.status_code != 200:
                    err_body = await response.aread()
                    raise Exception(f"OpenAI API returned status {response.status_code}: {err_body.decode()}")
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        raw = line[6:].strip()
                        if raw == "[DONE]":
                            break
                        try:
                            data = json.loads(raw)
                            chunk = data.get("choices", [{}])[0].get("delta", {}).get("content", "")
                            if chunk:
                                yield chunk
                        except Exception:
                            pass

    async def _chat_openrouter(self, messages: list, model: str, api_key: Optional[str]) -> AsyncGenerator[str, None]:
        if not api_key:
            yield "⚠️ OpenRouter API key is missing. Please enter your OpenRouter API key in Settings → LLM & AI Model Integration Matrix."
            return

        headers = {
            "Authorization": f"Bearer {api_key}",
            "HTTP-Referer": "https://synapseos.io",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model,
            "messages": messages,
            "stream": True
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", "https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload) as response:
                if response.status_code != 200:
                    err_body = await response.aread()
                    raise Exception(f"OpenRouter API returned status {response.status_code}: {err_body.decode()}")
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        raw = line[6:].strip()
                        if raw == "[DONE]":
                            break
                        try:
                            data = json.loads(raw)
                            chunk = data.get("choices", [{}])[0].get("delta", {}).get("content", "")
                            if chunk:
                                yield chunk
                        except Exception:
                            pass

    async def _chat_omniroute(
        self, 
        messages: list, 
        model: str, 
        api_key: Optional[str] = None, 
        omniroute_host: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        key = api_key or self._get_omniroute_active_key()
        host = (omniroute_host or "http://localhost:20128").rstrip("/")
        if not host.startswith("http://") and not host.startswith("https://"):
            host = f"http://{host}"

        headers = {
            "Content-Type": "application/json"
        }
        if key:
            headers["Authorization"] = f"Bearer {key}"

        formatted_messages = []
        is_reasoning_model = model.startswith("o1") or model.startswith("o3")
        for m in messages:
            msg_copy = dict(m)
            if is_reasoning_model and msg_copy.get("role") == "system":
                msg_copy["role"] = "developer"
            formatted_messages.append(msg_copy)

        payload = {
            "model": model,
            "messages": formatted_messages,
            "stream": True
        }

        url = f"{host}/v1/chat/completions"

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", url, headers=headers, json=payload) as response:
                if response.status_code != 200:
                    err_body = await response.aread()
                    raise Exception(f"OmniRoute returned status {response.status_code}: {err_body.decode(errors='ignore')}")

                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        raw = line[6:].strip()
                        if raw == "[DONE]":
                            break
                        try:
                            data = json.loads(raw)
                            choices = data.get("choices", [])
                            if not choices:
                                continue
                            delta = choices[0].get("delta", {})
                            content = delta.get("content") or delta.get("reasoning_content") or ""
                            if content:
                                yield content
                        except Exception:
                            pass

    _cached_ollama_url: Optional[str] = None

    async def _get_working_ollama_url(self, candidate_host: Optional[str] = None) -> str:
        candidates = []
        if candidate_host:
            candidates.append(candidate_host.rstrip('/'))
        if self._cached_ollama_url:
            candidates.append(self._cached_ollama_url)
        
        candidates.extend([
            settings.OLLAMA_BASE_URL.rstrip('/'),
            "http://host.docker.internal:53317",
            "http://127.0.0.1:11434",
            "http://localhost:11434",
            "http://host.docker.internal:11434",
            "http://172.17.0.1:11434",
            "http://172.18.0.1:11434",
        ])

        seen = set()
        unique_candidates = []
        for c in candidates:
            if c and c not in seen:
                seen.add(c)
                unique_candidates.append(c)

        for url in unique_candidates:
            try:
                async with httpx.AsyncClient(timeout=1.5) as client:
                    resp = await client.get(f"{url}/api/tags")
                    if resp.status_code == 200:
                        self._cached_ollama_url = url
                        return url
            except Exception:
                continue

        return candidate_host or settings.OLLAMA_BASE_URL

    async def _chat_ollama(self, messages: list, model: str, ollama_base_url: str, stream: bool) -> AsyncGenerator[str, None]:
        working_url = await self._get_working_ollama_url(ollama_base_url)
        ollama_url = f"{working_url.rstrip('/')}/api"
        async with httpx.AsyncClient(timeout=120.0) as client:
            req_data = {"model": model, "messages": messages, "stream": stream}
            async with client.stream("POST", f"{ollama_url}/chat", json=req_data) as response:
                if response.status_code == 404:
                    raise Exception(f"Model '{model}' not found in Ollama. Run 'ollama pull {model}' to download it.")
                if response.status_code == 401:
                    yield (
                        "### 🔒 Ollama Endpoint Unauthorized (401)\n\n"
                        f"The Ollama service at `{working_url}` returned `401 Unauthorized`.\n\n"
                        "**To fix this:**\n"
                        "- Configure a free Google Gemini API key in **Settings** (instant, $0).\n"
                        "- Or ensure your local Ollama instance (`ollama serve`) is listening on `127.0.0.1:11434` without proxy authentication."
                    )
                    return
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line:
                        data = json.loads(line)
                        if "message" in data and "content" in data["message"]:
                            yield data["message"]["content"]

    async def list_models(self) -> list:
        models = []
        try:
            working_url = await self._get_working_ollama_url()
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(f"{working_url.rstrip('/')}/api/tags")
                if resp.status_code == 200:
                    models.extend([{"name": m["name"], "provider": "ollama"} for m in resp.json().get("models", [])])
        except Exception:
            pass

        try:
            active_key = self._get_omniroute_active_key()
            headers = {"Authorization": f"Bearer {active_key}"} if active_key else {}
            async with httpx.AsyncClient(timeout=2.0) as client:
                resp = await client.get("http://localhost:20128/v1/models", headers=headers)
                if resp.status_code == 200:
                    data = resp.json().get("data", [])
                    models.extend([{"name": m["id"], "provider": "omniroute"} for m in data if "id" in m])
        except Exception:
            pass

        return models

    async def get_status(self) -> str:
        try:
            working_url = await self._get_working_ollama_url()
            async with httpx.AsyncClient(timeout=1.5) as client:
                resp = await client.get(f"{working_url.rstrip('/')}/api/tags")
                if resp.status_code == 200:
                    return "online"
        except Exception:
            pass

        try:
            active_key = self._get_omniroute_active_key()
            headers = {"Authorization": f"Bearer {active_key}"} if active_key else {}
            async with httpx.AsyncClient(timeout=1.5) as client:
                resp = await client.get("http://localhost:20128/v1/models", headers=headers)
                if resp.status_code == 200:
                    return "online"
        except Exception:
            pass

        return "offline"

    async def pull_model(self, model: str, candidate_host: Optional[str] = None) -> dict:
        working_url = await self._get_working_ollama_url(candidate_host)
        ollama_url = f"{working_url.rstrip('/')}/api"
        async with httpx.AsyncClient(timeout=900.0) as client:
            resp = await client.post(f"{ollama_url}/pull", json={"name": model, "stream": False})
            resp.raise_for_status()
            return resp.json()

llm_client = LLMClient()
