from sentence_transformers import SentenceTransformer
from app.config import settings

class EmbeddingService:
    def __init__(self):
        self._model = None

    @property
    def model(self):
        if self._model is None:
            self._model = SentenceTransformer(settings.EMBEDDING_MODEL)
        return self._model

    def embed_text(self, text: str) -> list[float]:
        return self.model.encode(text).tolist()

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        return self.model.encode(texts).tolist()

embedding_service = EmbeddingService()
