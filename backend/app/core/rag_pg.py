import json
import logging
from typing import List, Dict, Optional
from sentence_transformers import SentenceTransformer
from app.config import settings

logger = logging.getLogger(__name__)

class PGVectorRAGStore:
    def __init__(self):
        self.embedding_model = None
        self._init_model()

    def _init_model(self):
        try:
            logger.info(f"Loading embedding model '{settings.EMBEDDING_MODEL}'...")
            self.embedding_model = SentenceTransformer(settings.EMBEDDING_MODEL)
            logger.info("SentenceTransformer model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            self.embedding_model = None

    def get_embedding(self, text: str) -> List[float]:
        """
        Generates 384-dimensional vector embedding for input text.
        """
        if not self.embedding_model:
            return []
        try:
            return self.embedding_model.encode(text).tolist()
        except Exception as e:
            logger.error(f"Embedding generation error: {e}")
            return []

    def format_vector_pg(self, embedding: List[float]) -> str:
        """
        Formats python float list into pgvector vector format '[0.1, 0.2, ...]'.
        """
        return f"[{','.join(str(x) for x in embedding)}]"

pgvector_rag = PGVectorRAGStore()
