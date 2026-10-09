import aiosqlite
import json
import logging
import os
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from app.config import settings

try:
    import asyncpg
    HAS_ASYNCPG = True
except ImportError:
    HAS_ASYNCPG = False

logger = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self):
        self.sqlite_db_path = settings.SQLITE_DB_PATH
        self.postgres_url = settings.POSTGRES_URL
        self.backend = (settings.DATABASE_BACKEND or "auto").lower()
        self.default_tenant_id = settings.DEFAULT_TENANT_ID
        self.pool: Optional[Any] = None
        self.is_postgres = False

    async def init_db(self):
        if self.backend in ("postgres", "auto") and HAS_ASYNCPG and self.postgres_url:
            try:
                logger.info("Attempting connection to PostgreSQL...")
                self.pool = await asyncpg.create_pool(self.postgres_url, min_size=1, max_size=10, timeout=5)
                async with self.pool.acquire() as conn:
                    schema_path = os.path.join(os.path.dirname(__file__), "schema_pg.sql")
                    if os.path.exists(schema_path):
                        with open(schema_path, "r") as f:
                            schema_sql = f.read()
                        await conn.execute(schema_sql)
                self.is_postgres = True
                logger.info("Successfully connected to PostgreSQL and applied SaaS schema.")
                return
            except Exception as e:
                logger.warning(f"Could not initialize PostgreSQL ({e}). Falling back to SQLite.")
                self.is_postgres = False

        await self._init_sqlite()

    async def _init_sqlite(self):
        async with aiosqlite.connect(self.sqlite_db_path) as db:
            await db.execute('''
                CREATE TABLE IF NOT EXISTS conversations (
                    id TEXT PRIMARY KEY,
                    tenant_id TEXT,
                    title TEXT,
                    created_at TIMESTAMP,
                    updated_at TIMESTAMP,
                    is_pinned INTEGER DEFAULT 0
                )
            ''')
            await db.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    email TEXT UNIQUE,
                    hashed_password TEXT,
                    user_name TEXT,
                    assistant_name TEXT,
                    tenant_id TEXT,
                    created_at TIMESTAMP
                )
            ''')
            try:
                await db.execute("ALTER TABLE conversations ADD COLUMN is_pinned INTEGER DEFAULT 0")
            except Exception:
                pass
            try:
                await db.execute("ALTER TABLE conversations ADD COLUMN tenant_id TEXT")
            except Exception:
                pass
            try:
                await db.execute("ALTER TABLE users ADD COLUMN tenant_id TEXT")
            except Exception:
                pass
            try:
                await db.execute("ALTER TABLE users ADD COLUMN vault_path TEXT")
            except Exception:
                pass

            await db.execute('''
                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    tenant_id TEXT,
                    conversation_id TEXT,
                    role TEXT,
                    content TEXT,
                    sources TEXT,
                    created_at TIMESTAMP,
                    FOREIGN KEY(conversation_id) REFERENCES conversations(id)
                )
            ''')
            try:
                await db.execute("ALTER TABLE messages ADD COLUMN tenant_id TEXT")
            except Exception:
                pass
            await db.commit()
        logger.info("SQLite database initialized successfully.")

    async def create_conversation(self, title: str = "New Conversation", tenant_id: str = None) -> str:
        conv_id = str(uuid.uuid4())
        tenant_uuid = tenant_id or self.default_tenant_id
        now = datetime.utcnow().isoformat()

        if self.is_postgres and self.pool:
            async with self.pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO conversations (id, tenant_id, title, is_pinned)
                    VALUES ($1::uuid, $2::uuid, $3, FALSE)
                    """,
                    conv_id, tenant_uuid, title
                )
            return conv_id

        async with aiosqlite.connect(self.sqlite_db_path) as db:
            await db.execute(
                "INSERT INTO conversations (id, tenant_id, title, created_at, updated_at, is_pinned) VALUES (?, ?, ?, ?, ?, 0)",
                (conv_id, tenant_uuid, title, now, now)
            )
            await db.commit()
        return conv_id

    async def get_conversations(self, tenant_id: str = None) -> list:
        tenant_uuid = tenant_id or self.default_tenant_id

        if self.is_postgres and self.pool:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(
                    """
                    SELECT id, tenant_id, title, created_at, updated_at, is_pinned
                    FROM conversations
                    WHERE tenant_id = $1::uuid
                    ORDER BY is_pinned DESC, updated_at DESC
                    """,
                    tenant_uuid
                )
                result = []
                for row in rows:
                    r = dict(row)
                    r['id'] = str(r['id'])
                    r['tenant_id'] = str(r['tenant_id'])
                    r['created_at'] = r['created_at'].isoformat() if r['created_at'] else None
                    r['updated_at'] = r['updated_at'].isoformat() if r['updated_at'] else None
                    r['is_pinned'] = bool(r.get('is_pinned', False))
                    result.append(r)
                return result

        async with aiosqlite.connect(self.sqlite_db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT * FROM conversations ORDER BY is_pinned DESC, updated_at DESC")
            rows = await cursor.fetchall()
            result = []
            for row in rows:
                r = dict(row)
                r['is_pinned'] = bool(r.get('is_pinned', 0))
                result.append(r)
            return result

    async def update_conversation(self, conversation_id: str, title: str = None, is_pinned: bool = None):
        if self.is_postgres and self.pool:
            async with self.pool.acquire() as conn:
                if title is not None and is_pinned is not None:
                    await conn.execute(
                        "UPDATE conversations SET title = $1, is_pinned = $2, updated_at = NOW() WHERE id = $3::uuid",
                        title, is_pinned, conversation_id
                    )
                elif title is not None:
                    await conn.execute(
                        "UPDATE conversations SET title = $1, updated_at = NOW() WHERE id = $2::uuid",
                        title, conversation_id
                    )
                elif is_pinned is not None:
                    await conn.execute(
                        "UPDATE conversations SET is_pinned = $1, updated_at = NOW() WHERE id = $2::uuid",
                        is_pinned, conversation_id
                    )
            return

        async with aiosqlite.connect(self.sqlite_db_path) as db:
            if title is not None:
                await db.execute("UPDATE conversations SET title = ? WHERE id = ?", (title, conversation_id))
            if is_pinned is not None:
                val = 1 if is_pinned else 0
                await db.execute("UPDATE conversations SET is_pinned = ? WHERE id = ?", (val, conversation_id))
            await db.commit()

    async def get_messages(self, conversation_id: str) -> list:
        if self.is_postgres and self.pool:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(
                    """
                    SELECT id, tenant_id, conversation_id, role, content, sources, created_at
                    FROM messages
                    WHERE conversation_id = $1::uuid
                    ORDER BY created_at ASC
                    """,
                    conversation_id
                )
                messages = []
                for row in rows:
                    msg = dict(row)
                    msg['id'] = str(msg['id'])
                    msg['tenant_id'] = str(msg['tenant_id'])
                    msg['conversation_id'] = str(msg['conversation_id'])
                    msg['created_at'] = msg['created_at'].isoformat() if msg['created_at'] else None
                    if isinstance(msg['sources'], str):
                        try:
                            msg['sources'] = json.loads(msg['sources'])
                        except Exception:
                            pass
                    messages.append(msg)
                return messages

        async with aiosqlite.connect(self.sqlite_db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
                (conversation_id,)
            )
            rows = await cursor.fetchall()
            messages = []
            for row in rows:
                msg = dict(row)
                msg['sources'] = json.loads(msg['sources']) if msg['sources'] else None
                messages.append(msg)
            return messages

    async def add_message(self, conversation_id: str, role: str, content: str, sources: list = None, tenant_id: str = None) -> str:
        msg_id = str(uuid.uuid4())
        tenant_uuid = tenant_id or self.default_tenant_id
        now = datetime.utcnow().isoformat()
        sources_json = json.dumps(sources) if sources else None

        if self.is_postgres and self.pool:
            async with self.pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO messages (id, tenant_id, conversation_id, role, content, sources)
                    VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6::jsonb)
                    """,
                    msg_id, tenant_uuid, conversation_id, role, content, sources_json
                )
                await conn.execute(
                    "UPDATE conversations SET updated_at = NOW() WHERE id = $1::uuid",
                    conversation_id
                )
            return msg_id

        async with aiosqlite.connect(self.sqlite_db_path) as db:
            await db.execute(
                "INSERT INTO messages (id, conversation_id, role, content, sources, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (msg_id, conversation_id, role, content, sources_json, now)
            )
            await db.execute(
                "UPDATE conversations SET updated_at = ? WHERE id = ?",
                (now, conversation_id)
            )
            await db.commit()
        return msg_id

    async def delete_conversation(self, conversation_id: str):
        if self.is_postgres and self.pool:
            async with self.pool.acquire() as conn:
                await conn.execute("DELETE FROM messages WHERE conversation_id = $1::uuid", conversation_id)
                await conn.execute("DELETE FROM conversations WHERE id = $1::uuid", conversation_id)
            return

        async with aiosqlite.connect(self.sqlite_db_path) as db:
            await db.execute("DELETE FROM messages WHERE conversation_id = ?", (conversation_id,))
            await db.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))
            await db.commit()

    async def create_user(self, email: str, hashed_password: str, user_name: str = "Operator", assistant_name: str = "Synapse", tenant_id: str = None) -> dict:
        user_id = str(uuid.uuid4())
        tenant_uuid = tenant_id or self.default_tenant_id
        now = datetime.utcnow().isoformat()

        if self.is_postgres and self.pool:
            async with self.pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO users (id, tenant_id, email, hashed_password, user_name, assistant_name)
                    VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6)
                    """,
                    user_id, tenant_uuid, email, hashed_password, user_name, assistant_name
                )
            return {"id": user_id, "email": email, "user_name": user_name, "assistant_name": assistant_name, "tenant_id": tenant_uuid, "created_at": now}

        async with aiosqlite.connect(self.sqlite_db_path) as db:
            await db.execute(
                "INSERT INTO users (id, email, hashed_password, user_name, assistant_name, tenant_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (user_id, email, hashed_password, user_name, assistant_name, tenant_uuid, now)
            )
            await db.commit()
        return {"id": user_id, "email": email, "user_name": user_name, "assistant_name": assistant_name, "tenant_id": tenant_uuid, "created_at": now}

    async def get_user_by_email(self, email: str) -> dict:
        if self.is_postgres and self.pool:
            async with self.pool.acquire() as conn:
                row = await conn.fetchrow("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", email)
                if row:
                    r = dict(row)
                    r['id'] = str(r['id'])
                    r['tenant_id'] = str(r['tenant_id'])
                    r['created_at'] = r['created_at'].isoformat() if r['created_at'] else None
                    return r
                return None

        async with aiosqlite.connect(self.sqlite_db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", (email,))
            row = await cursor.fetchone()
            return dict(row) if row else None

    async def get_user_by_id(self, user_id: str) -> dict:
        if self.is_postgres and self.pool:
            async with self.pool.acquire() as conn:
                try:
                    row = await conn.fetchrow("SELECT * FROM users WHERE id = $1::uuid", user_id)
                    if row:
                        r = dict(row)
                        r['id'] = str(r['id'])
                        r['tenant_id'] = str(r['tenant_id'])
                        r['created_at'] = r['created_at'].isoformat() if r['created_at'] else None
                        return r
                except Exception:
                    pass
                return None

        async with aiosqlite.connect(self.sqlite_db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            row = await cursor.fetchone()
            return dict(row) if row else None

    async def delete_user(self, user_id: str):
        if self.is_postgres and self.pool:
            async with self.pool.acquire() as conn:
                await conn.execute("DELETE FROM users WHERE id = $1::uuid", user_id)
            return

        async with aiosqlite.connect(self.sqlite_db_path) as db:
            await db.execute("DELETE FROM users WHERE id = ?", (user_id,))
            await db.commit()

    async def update_user_vault_path(self, user_id: str, vault_path: str):
        if self.is_postgres and self.pool:
            async with self.pool.acquire() as conn:
                try:
                    await conn.execute("UPDATE users SET vault_path = $1 WHERE id = $2::uuid", vault_path, user_id)
                except Exception as e:
                    logger.warning(f"Failed to update vault_path in postgres: {e}")
            return

        async with aiosqlite.connect(self.sqlite_db_path) as db:
            try:
                await db.execute("UPDATE users SET vault_path = ? WHERE id = ?", (vault_path, user_id))
                await db.commit()
            except Exception as e:
                logger.warning(f"Failed to update vault_path in sqlite: {e}")

    async def update_user_profile(self, user_id: str, user_name: Optional[str] = None, assistant_name: Optional[str] = None):
        if self.is_postgres and self.pool:
            async with self.pool.acquire() as conn:
                try:
                    if user_name and assistant_name:
                        await conn.execute("UPDATE users SET user_name = $1, assistant_name = $2 WHERE id = $3::uuid", user_name, assistant_name, user_id)
                    elif user_name:
                        await conn.execute("UPDATE users SET user_name = $1 WHERE id = $2::uuid", user_name, user_id)
                    elif assistant_name:
                        await conn.execute("UPDATE users SET assistant_name = $1 WHERE id = $2::uuid", assistant_name, user_id)
                except Exception as e:
                    logger.warning(f"Failed to update profile in postgres: {e}")
            return

        async with aiosqlite.connect(self.sqlite_db_path) as db:
            try:
                if user_name and assistant_name:
                    await db.execute("UPDATE users SET user_name = ?, assistant_name = ? WHERE id = ?", (user_name, assistant_name, user_id))
                elif user_name:
                    await db.execute("UPDATE users SET user_name = ? WHERE id = ?", (user_name, user_id))
                elif assistant_name:
                    await db.execute("UPDATE users SET assistant_name = ? WHERE id = ?", (assistant_name, user_id))
                await db.commit()
            except Exception as e:
                logger.warning(f"Failed to update profile in sqlite: {e}")

db_manager = DatabaseManager()
