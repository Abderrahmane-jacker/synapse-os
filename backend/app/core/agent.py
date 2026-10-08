from app.core.llm import llm_client
from app.core.rag import rag_engine
from app.core.memory import memory
from app.models.database import db_manager
from typing import AsyncGenerator
import logging

logger = logging.getLogger(__name__)

class NexusAgent:
    async def process_message(
        self, 
        message: str, 
        conversation_id: str, 
        image: str = None, 
        model: str = None, 
        system_prompt: str = None,
        provider: str = "ollama",
        api_key: str = None,
        ollama_host: str = None,
        omniroute_host: str = None,
        operator_name: str = "Operator",
        assistant_name: str = "Synapse"
    ) -> AsyncGenerator[str, None]:
        # Save user message
        await db_manager.add_message(conversation_id, "user", message)

        # 1. Retrieve history
        history = await db_manager.get_messages(conversation_id)
        
        # 2. Search RAG
        rag_results = await rag_engine.search(message)
        
        # 3. Build context
        messages = memory.build_messages(
            message, 
            history, 
            rag_results, 
            custom_system_prompt=system_prompt,
            operator_name=operator_name,
            assistant_name=assistant_name
        )
        
        # 3.5 Attach image if provided
        if image:
            # Attach to the last user message in the array
            for msg in reversed(messages):
                if msg.get("role") == "user":
                    msg["images"] = [image]
                    break

        # 4. Stream LLM response
        full_response = ""
        async for chunk in llm_client.chat(
            messages, 
            model=model, 
            provider=provider, 
            api_key=api_key, 
            ollama_host=ollama_host,
            omniroute_host=omniroute_host
        ):
            full_response += chunk
            yield chunk

        if not full_response.strip():
            fallback_msg = f"⚠️ No response received from AI Provider '{provider or 'ollama'}' (Model: '{model or 'default'}'). Please check your API Key & Model Settings in /settings."
            yield fallback_msg
            full_response = fallback_msg

        # 5. Save assistant message with sources
        sources = [{"title": r["metadata"]["title"], "path": r["metadata"]["path"]} for r in rag_results]
        await db_manager.add_message(conversation_id, "assistant", full_response, sources)

agent = NexusAgent()
