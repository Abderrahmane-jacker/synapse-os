from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import logging
import asyncio
from app.core.agent_loop import AgentSession

logger = logging.getLogger(__name__)
router = APIRouter()

# Store active sessions in memory
active_sessions = {}

async def run_agent_reader(session_id: str, agent: AgentSession):
    try:
        async for payload in agent.read_stream():
            data = json.loads(payload)
            # Broadcast to all active WebSocket listeners
            disconnected = set()
            for ws in list(agent.listeners):
                try:
                    await ws.send_text(payload)
                except Exception:
                    disconnected.add(ws)
            agent.listeners -= disconnected
    except Exception as e:
        logger.error(f"Error streaming output for session {session_id}: {e}")
    finally:
        if session_id in active_sessions:
            del active_sessions[session_id]

@router.websocket("/agent")
async def websocket_agent_endpoint(websocket: WebSocket):
    await websocket.accept()
    session_id = None
    
    try:
        # Wait for initialization payload
        init_data = await websocket.receive_text()
        init_payload = json.loads(init_data)
        
        command = init_payload.get("command")
        cwd = init_payload.get("cwd")
        session_id = init_payload.get("session_id") or "default_claude_session"
        
        if session_id in active_sessions and active_sessions[session_id]._running:
            agent = active_sessions[session_id]
            logger.info(f"Reattaching client to existing AgentSession {session_id}")
        else:
            if not command or not cwd:
                await websocket.send_text(json.dumps({"type": "error", "content": "Missing initialization parameters"}))
                await websocket.close()
                return
            agent = AgentSession(command, cwd)
            active_sessions[session_id] = agent
            await agent.start()
            asyncio.create_task(run_agent_reader(session_id, agent))

        # Replay accumulated terminal history
        if agent.history_buffer:
            await websocket.send_text(json.dumps({
                "type": "output",
                "content": agent.history_buffer
            }))

        agent.listeners.add(websocket)
        
        # Listen for inputs from websocket and send to agent
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            
            if payload.get("type") == "input":
                text = payload.get("content", "")
                agent.send_input(text)
            elif payload.get("type") in ["stop", "terminate"]:
                logger.info(f"Explicit termination requested for session {session_id}")
                await agent.stop()
                if session_id in active_sessions:
                    del active_sessions[session_id]
                break
                
    except WebSocketDisconnect:
        logger.info(f"Agent websocket client disconnected from session {session_id}")
    except Exception as e:
        logger.error(f"Agent websocket error: {e}")
        try:
            await websocket.send_text(json.dumps({"type": "error", "content": str(e)}))
        except:
            pass
    finally:
        if session_id in active_sessions:
            active_sessions[session_id].listeners.discard(websocket)
