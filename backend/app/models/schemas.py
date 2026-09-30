from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class ChatMessage(BaseModel):
    role: str
    content: str
    sources: Optional[List[Dict[str, Any]]] = None
    created_at: Optional[datetime] = None

class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str
    image: Optional[str] = None
    model: Optional[str] = None
    system_prompt: Optional[str] = None
    provider: Optional[str] = "ollama"
    api_key: Optional[str] = None
    ollama_host: Optional[str] = None
    operator_name: Optional[str] = "Operator"
    assistant_name: Optional[str] = "Synapse"

class ChatResponse(BaseModel):
    conversation_id: str
    message: ChatMessage

class Conversation(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    is_pinned: Optional[bool] = False

class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    is_pinned: Optional[bool] = None

class ConversationList(BaseModel):
    conversations: List[Conversation]

class KnowledgeNote(BaseModel):
    title: str
    content: str
    tags: List[str]
    links: List[str]
    frontmatter: Dict[str, Any]
    modified: datetime
    path: str

class SearchResult(BaseModel):
    id: str
    score: float
    metadata: Dict[str, Any]
    content: str

class SearchResponse(BaseModel):
    results: List[SearchResult]

class IndexStats(BaseModel):
    total_notes: int
    total_chunks: int
    last_indexed: Optional[datetime] = None

class ModelInfo(BaseModel):
    name: str
    provider: str

class SystemHealth(BaseModel):
    status: str

class SystemStatus(BaseModel):
    llm_status: str
    chromadb_status: str
    vault_stats: IndexStats
