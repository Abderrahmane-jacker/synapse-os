import os
import re
import hashlib
import logging
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.config import settings
from app.models.database import db_manager

logger = logging.getLogger(__name__)

class RAGEngine:
    def __init__(self):
        self.last_indexed = None
        self._chroma_client = None
        self._chroma_collection = None

    def _get_chroma_collection(self):
        if self._chroma_collection is None:
            import chromadb
            try:
                self._chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)
            except Exception as e:
                logger.warning(f"ChromaDB PersistentClient error: {e}. Falling back to EphemeralClient.")
                self._chroma_client = chromadb.EphemeralClient()
            self._chroma_collection = self._chroma_client.get_or_create_collection(
                "nexus_notes",
                metadata={"hnsw:space": "cosine"}
            )
        return self._chroma_collection

    def _chunk_text(self, text: str, max_chunk_size: int = 1000, overlap: int = 100) -> List[str]:
        """Split markdown text into overlapping chunks by headers or paragraphs."""
        sections = re.split(r'\n(?=#{1,6}\s)', text)
        chunks = []

        for section in sections:
            if len(section) <= max_chunk_size:
                if section.strip():
                    chunks.append(section.strip())
            else:
                paragraphs = section.split('\n\n')
                current_chunk = ""
                for p in paragraphs:
                    if len(current_chunk) + len(p) <= max_chunk_size:
                        current_chunk += p + "\n\n"
                    else:
                        if current_chunk.strip():
                            chunks.append(current_chunk.strip())
                        current_chunk = p + "\n\n"
                if current_chunk.strip():
                    chunks.append(current_chunk.strip())

        return chunks if chunks else [text[:max_chunk_size]]

    async def index_vault(self, vault_path: str = None, tenant_id: str = None) -> Dict[str, Any]:
        """Re-index all markdown notes from the vault into PostgreSQL (or ChromaDB)."""
        from app.services.obsidian import obsidian_service
        safe_path = vault_path or settings.OBSIDIAN_VAULT_PATH
        notes = obsidian_service.scan_vault(safe_path)
        tenant_uuid = tenant_id or settings.DEFAULT_TENANT_ID

        if db_manager.is_postgres and db_manager.pool:
            return await self._index_vault_postgres(notes, tenant_uuid, safe_path)
        else:
            return await self._index_vault_chroma(notes)

    async def _index_vault_postgres(self, notes: list, tenant_id: str, vault_path: str) -> Dict[str, Any]:
        from app.services.embeddings import embedding_service
        logger.info(f"Indexing {len(notes)} notes into PostgreSQL (pgvector) for tenant {tenant_id}...")

        async with db_manager.pool.acquire() as conn:
            async with conn.transaction():
                # Clear existing chunks and notes for this tenant
                await conn.execute("DELETE FROM note_chunks WHERE tenant_id = $1::uuid", tenant_id)
                await conn.execute("DELETE FROM note_links WHERE tenant_id = $1::uuid", tenant_id)
                await conn.execute("DELETE FROM notes WHERE tenant_id = $1::uuid", tenant_id)

                total_chunks = 0
                for note in notes:
                    content = note.get("content", "")
                    if not content or not content.strip():
                        continue
                    title = note.get("title", "Untitled")
                    path = note.get("path", title)
                    tags = note.get("tags", [])
                    note_id = str(uuid.uuid4())

                    # Insert note record
                    await conn.execute(
                        """
                        INSERT INTO notes (id, tenant_id, file_path, title, tags, raw_content)
                        VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6)
                        """,
                        note_id, tenant_id, path, title, tags, content
                    )

                    # Extract wikilinks and save to note_links
                    links = re.findall(r'\[\[(.*?)\]\]', content)
                    for target_title in set(links):
                        clean_target = target_title.split("|")[0].strip()
                        await conn.execute(
                            """
                            INSERT INTO note_links (tenant_id, source_note_id, target_note_title)
                            VALUES ($1::uuid, $2::uuid, $3)
                            """,
                            tenant_id, note_id, clean_target
                        )

                    # Chunk and embed
                    chunks = self._chunk_text(content)
                    if not chunks:
                        continue
                    embeddings = embedding_service.embed_batch(chunks)
                    for idx, (chunk, emb) in enumerate(zip(chunks, embeddings)):
                        chunk_id = str(uuid.uuid4())
                        emb_str = f"[{','.join(str(x) for x in emb)}]"
                        await conn.execute(
                            """
                            INSERT INTO note_chunks (id, tenant_id, note_id, chunk_index, content, embedding)
                            VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6::vector)
                            """,
                            chunk_id, tenant_id, note_id, idx, chunk, emb_str
                        )
                        total_chunks += 1

        self.last_indexed = datetime.utcnow()
        logger.info(f"Successfully indexed {total_chunks} chunks into PostgreSQL.")
        return await self.get_stats(tenant_id)

    async def _index_vault_chroma(self, notes: list) -> Dict[str, Any]:
        col = self._get_chroma_collection()
        try:
            self._chroma_client.delete_collection("nexus_notes")
        except Exception:
            pass
        self._chroma_collection = self._chroma_client.get_or_create_collection(
            "nexus_notes",
            metadata={"hnsw:space": "cosine"}
        )
        col = self._chroma_collection

        docs = []
        metadatas = []
        ids = []
        seen_ids = set()

        for note in notes:
            content = note.get("content", "")
            if not content or not content.strip():
                continue
            chunks = self._chunk_text(content)
            title = note.get("title", "Untitled")
            path = note.get("path", title)
            path_hash = hashlib.md5(path.encode("utf-8")).hexdigest()[:8]
            safe_title = re.sub(r'[^a-zA-Z0-9_\-]', '_', title)[:30]

            for i, chunk in enumerate(chunks):
                doc_id = f"{path_hash}_{safe_title}__chunk_{i}"
                if doc_id in seen_ids:
                    doc_id = f"{doc_id}_{len(seen_ids)}"
                seen_ids.add(doc_id)

                docs.append(chunk)
                metadatas.append({
                    "title": title,
                    "path": path,
                    "tags": ",".join(note.get("tags", [])),
                    "modified": str(note.get("modified", ""))
                })
                ids.append(doc_id)

        if docs:
            from app.services.embeddings import embedding_service
            embeddings = embedding_service.embed_batch(docs)
            batch_size = 500
            for i in range(0, len(docs), batch_size):
                end = min(i + batch_size, len(docs))
                col.upsert(
                    documents=docs[i:end],
                    embeddings=embeddings[i:end],
                    metadatas=metadatas[i:end],
                    ids=ids[i:end]
                )

        self.last_indexed = datetime.utcnow()
        return await self.get_stats()

    async def search(self, query: str, top_k: int = 5, tenant_id: str = None) -> list:
        """Perform semantic search over indexed notes."""
        tenant_uuid = tenant_id or settings.DEFAULT_TENANT_ID

        if db_manager.is_postgres and db_manager.pool:
            from app.services.embeddings import embedding_service
            query_emb = embedding_service.embed_text(query)
            if not query_emb:
                return []
            emb_str = f"[{','.join(str(x) for x in query_emb)}]"

            async with db_manager.pool.acquire() as conn:
                rows = await conn.fetch(
                    """
                    SELECT nc.content, n.title, n.file_path, n.tags, (nc.embedding <=> $1::vector) AS distance
                    FROM note_chunks nc
                    JOIN notes n ON nc.note_id = n.id
                    WHERE nc.tenant_id = $2::uuid
                    ORDER BY nc.embedding <=> $1::vector
                    LIMIT $3
                    """,
                    emb_str, tenant_uuid, top_k
                )
                return [{
                    "content": r["content"],
                    "metadata": {
                        "title": r["title"],
                        "path": r["file_path"],
                        "tags": ",".join(r["tags"] or [])
                    },
                    "distance": float(r["distance"])
                } for r in rows]

        col = self._get_chroma_collection()
        if col.count() == 0:
            return []

        from app.services.embeddings import embedding_service
        query_embedding = embedding_service.embed_text(query)
        results = col.query(
            query_embeddings=[query_embedding],
            n_results=min(top_k, col.count())
        )

        formatted_results = []
        if results and results['documents'] and len(results['documents']) > 0:
            for i in range(len(results['documents'][0])):
                formatted_results.append({
                    "content": results['documents'][0][i],
                    "metadata": results['metadatas'][0][i] if results['metadatas'] else {},
                    "distance": results['distances'][0][i] if 'distances' in results and results['distances'] else 0
                })

        return formatted_results

    async def get_stats(self, tenant_id: str = None) -> Dict[str, Any]:
        """Return RAG index statistics."""
        tenant_uuid = tenant_id or settings.DEFAULT_TENANT_ID

        if db_manager.is_postgres and db_manager.pool:
            try:
                async with db_manager.pool.acquire() as conn:
                    chunk_count = await conn.fetchval(
                        "SELECT COUNT(*) FROM note_chunks WHERE tenant_id = $1::uuid", tenant_uuid
                    )
                    return {
                        "total_chunks": chunk_count or 0,
                        "last_indexed": self.last_indexed.isoformat() if self.last_indexed else None,
                        "status": "ready" if (chunk_count or 0) > 0 else "empty"
                    }
            except Exception:
                pass

        col = self._get_chroma_collection()
        count = col.count()
        return {
            "total_chunks": count,
            "last_indexed": self.last_indexed.isoformat() if self.last_indexed else None,
            "status": "ready" if count > 0 else "empty"
        }

rag_engine = RAGEngine()
