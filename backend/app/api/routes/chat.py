import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Header, HTTPException
from typing import Optional
from app.models.schemas import ChatRequest, ConversationList, ChatResponse, ChatMessage
from app.models.database import db_manager
from app.core.agent import agent
from app.core.security import decode_access_token

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Send a chat message and get a complete response (non-streaming)."""
    conv_id = request.conversation_id
    if not conv_id:
        # Generate title from first ~50 chars of the message
        title = request.message[:50].strip() + ("..." if len(request.message) > 50 else "")
        conv_id = await db_manager.create_conversation(title)

    response_text = ""
    async for chunk in agent.process_message(
        request.message, 
        conv_id, 
        request.image,
        model=request.model,
        system_prompt=request.system_prompt,
        provider=request.provider,
        api_key=request.api_key,
        ollama_host=request.ollama_host,
        omniroute_host=request.omniroute_host,
        operator_name=request.operator_name or "Operator",
        assistant_name=request.assistant_name or "Synapse"
    ):
        response_text += chunk

    messages = await db_manager.get_messages(conv_id)
    last_msg = messages[-1]

    return ChatResponse(
        conversation_id=conv_id,
        message=ChatMessage(**last_msg)
    )


@router.websocket("/stream")
async def chat_stream(websocket: WebSocket):
    """WebSocket endpoint for streaming chat responses."""
    origin = websocket.headers.get("origin")
    if origin:
        allowed = (
            "localhost" in origin
            or "127.0.0.1" in origin
            or "0.0.0.0" in origin
            or "192.168." in origin
            or "10." in origin
            or "172." in origin
        )
        if not allowed:
            logger.warning(f"Rejected WebSocket connection from unauthorized origin: {origin}")
            await websocket.close(code=1008)
            return

    await websocket.accept()
    logger.info("WebSocket client connected")

    try:
        while True:
            data = await websocket.receive_json()
            conv_id = data.get("conversation_id")
            message = data.get("message", "").strip()
            image = data.get("image")
            model = data.get("model")
            system_prompt = data.get("system_prompt")
            provider = data.get("provider")
            api_key = data.get("api_key")
            ollama_host = data.get("ollama_host")
            omniroute_host = data.get("omniroute_host")
            operator_name = data.get("operator_name") or "Operator"
            assistant_name = data.get("assistant_name") or "Synapse"

            if not message and not image:
                await websocket.send_json({"type": "error", "message": "Empty message"})
                continue

            if not conv_id:
                title = message[:50].strip() + ("..." if len(message) > 50 else "")
                conv_id = await db_manager.create_conversation(title)

            await websocket.send_json({"type": "connected", "conversation_id": conv_id})

            try:
                async for chunk in agent.process_message(
                    message, 
                    conv_id, 
                    image,
                    model=model,
                    system_prompt=system_prompt,
                    provider=provider,
                    api_key=api_key,
                    ollama_host=ollama_host,
                    omniroute_host=omniroute_host,
                    operator_name=operator_name,
                    assistant_name=assistant_name
                ):
                    await websocket.send_json({"type": "token", "content": chunk})

                # Retrieve sources from the saved assistant message
                messages = await db_manager.get_messages(conv_id)
                if messages:
                    last_msg = messages[-1]
                    sources = last_msg.get("sources")
                    if sources:
                        await websocket.send_json({"type": "sources", "sources": sources})

                await websocket.send_json({"type": "done", "conversation_id": conv_id})

            except Exception as e:
                logger.error(f"Error processing message: {e}")
                await websocket.send_json({"type": "error", "message": str(e)})

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")


@router.get("/conversations", response_model=ConversationList)
async def list_conversations(authorization: Optional[str] = Header(None)):
    """List all conversations for local operator or authenticated user."""
    convs = await db_manager.get_conversations()
    return ConversationList(conversations=convs)


@router.post("/conversations")
async def create_conversation(authorization: Optional[str] = Header(None)):
    """Create a new empty conversation."""
    conv_id = await db_manager.create_conversation()
    return {"id": conv_id}


@router.get("/history")
async def get_history(conversation_id: str, authorization: Optional[str] = Header(None)):
    """Get all messages for a specific conversation."""
    msgs = await db_manager.get_messages(conversation_id)
    return msgs


@router.delete("/conversations/{id}")
async def delete_conversation(id: str, authorization: Optional[str] = Header(None)):
    """Delete a conversation and all its messages."""
    await db_manager.delete_conversation(id)
    return {"status": "deleted"}


@router.put("/conversations/{id}")
async def update_conversation(id: str, title: str = None, is_pinned: bool = None, authorization: Optional[str] = Header(None)):
    """Update title or pinned status of a conversation."""
    await db_manager.update_conversation(id, title=title, is_pinned=is_pinned)
    return {"status": "updated"}
