from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.api.middleware import setup_middlewares
from app.models.database import db_manager
from app.api.routes import chat, knowledge, voice, system, commands, auth, vault_sync
from fastapi.responses import RedirectResponse
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing Database...")
    await db_manager.init_db()
    logger.info("Nexus Backend Started.")
    yield
    # Shutdown
    logger.info("Nexus Backend Shutting Down.")

app = FastAPI(title="Project Nexus API", lifespan=lifespan)

setup_middlewares(app)

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(vault_sync.router, prefix="/api/vault", tags=["VaultSync"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(knowledge.router, prefix="/api/knowledge", tags=["Knowledge"])
app.include_router(voice.router, prefix="/api/voice", tags=["Voice"])
app.include_router(system.router, prefix="/api/system", tags=["System"])
app.include_router(commands.router, prefix="/api/commands", tags=["Commands"])

@app.get("/")
async def root():
    return RedirectResponse(url="/docs")
