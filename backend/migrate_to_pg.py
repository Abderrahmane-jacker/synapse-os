import asyncio
import os
import aiosqlite
import asyncpg
import json
from app.config import settings
from app.core.rag import rag_engine
from app.models.database import db_manager

async def migrate():
    print("=== Starting Migration to PostgreSQL + pgvector ===")
    postgres_url = settings.POSTGRES_URL
    print(f"[+] Connecting to PostgreSQL at {postgres_url}...")

    try:
        conn = await asyncpg.connect(postgres_url, timeout=10)
    except Exception as e:
        print(f"[!] Failed to connect to PostgreSQL: {e}")
        return

    # 1. Apply Schema
    schema_path = os.path.join(os.path.dirname(__file__), "app", "models", "schema_pg.sql")
    print(f"[+] Applying schema from {schema_path}...")
    with open(schema_path, "r") as f:
        schema_sql = f.read()
    await conn.execute(schema_sql)
    print("[✓] Schema applied successfully.")

    # 2. Migrate from SQLite if nexus.db exists
    sqlite_path = settings.SQLITE_DB_PATH
    if os.path.exists(sqlite_path):
        print(f"[+] Migrating existing data from SQLite: {sqlite_path}...")
        async with aiosqlite.connect(sqlite_path) as sdb:
            sdb.row_factory = aiosqlite.Row

            # Users
            try:
                cursor = await sdb.execute("SELECT * FROM users")
                users = await cursor.fetchall()
                print(f"    - Found {len(users)} users in SQLite.")
                for u in users:
                    u_dict = dict(u)
                    await conn.execute(
                        """
                        INSERT INTO users (id, tenant_id, email, hashed_password, user_name, assistant_name)
                        VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6)
                        ON CONFLICT (email) DO NOTHING
                        """,
                        u_dict["id"],
                        u_dict.get("tenant_id") or settings.DEFAULT_TENANT_ID,
                        u_dict["email"],
                        u_dict["hashed_password"],
                        u_dict.get("user_name") or "Operator",
                        u_dict.get("assistant_name") or "Synapse"
                    )
            except Exception as e:
                print(f"    [!] Error migrating users: {e}")

            # Conversations
            try:
                cursor = await sdb.execute("SELECT * FROM conversations")
                convs = await cursor.fetchall()
                print(f"    - Found {len(convs)} conversations in SQLite.")
                for c in convs:
                    c_dict = dict(c)
                    await conn.execute(
                        """
                        INSERT INTO conversations (id, tenant_id, title, is_pinned)
                        VALUES ($1::uuid, $2::uuid, $3, $4)
                        ON CONFLICT (id) DO NOTHING
                        """,
                        c_dict["id"],
                        c_dict.get("tenant_id") or settings.DEFAULT_TENANT_ID,
                        c_dict["title"],
                        bool(c_dict.get("is_pinned", 0))
                    )
            except Exception as e:
                print(f"    [!] Error migrating conversations: {e}")

            # Messages
            try:
                cursor = await sdb.execute("SELECT * FROM messages")
                msgs = await cursor.fetchall()
                print(f"    - Found {len(msgs)} messages in SQLite.")
                for m in msgs:
                    m_dict = dict(m)
                    sources = m_dict.get("sources")
                    if sources and isinstance(sources, str):
                        try:
                            sources = json.loads(sources)
                        except Exception:
                            sources = None
                    sources_json = json.dumps(sources) if sources else None

                    await conn.execute(
                        """
                        INSERT INTO messages (id, tenant_id, conversation_id, role, content, sources)
                        VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6::jsonb)
                        ON CONFLICT (id) DO NOTHING
                        """,
                        m_dict["id"],
                        m_dict.get("tenant_id") or settings.DEFAULT_TENANT_ID,
                        m_dict["conversation_id"],
                        m_dict["role"],
                        m_dict["content"],
                        sources_json
                    )
            except Exception as e:
                print(f"    [!] Error migrating messages: {e}")

    await conn.close()

    # 3. Index Obsidian Vault into PostgreSQL
    vault_path = settings.OBSIDIAN_VAULT_PATH
    if vault_path and os.path.exists(vault_path):
        print(f"[+] Indexing Obsidian Vault into PostgreSQL pgvector: {vault_path}...")
        await db_manager.init_db()
        stats = await rag_engine.index_vault(vault_path)
        print(f"[✓] Vault indexed successfully: {stats}")
    else:
        print(f"[*] No vault found at {vault_path}. Skipping initial vault indexing.")

    print("\n🎉 Migration to PostgreSQL + pgvector Complete!")

if __name__ == "__main__":
    asyncio.run(migrate())
