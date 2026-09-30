CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Organizations / Workspaces (Tenants)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(128) NOT NULL,
    plan VARCHAR(32) DEFAULT 'free',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default system tenant
INSERT INTO tenants (id, slug, name, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'default-tenant', 'Default Workspace', 'pro')
ON CONFLICT (id) DO NOTHING;

-- 2. Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    user_name VARCHAR(100) DEFAULT 'Operator',
    assistant_name VARCHAR(100) DEFAULT 'Synapse',
    role VARCHAR(32) DEFAULT 'owner',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tenant API Keys (BYOK)
CREATE TABLE IF NOT EXISTS tenant_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    encrypted_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, provider)
);

-- 4. Vaults
CREATE TABLE IF NOT EXISTS vaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    sync_source VARCHAR(32) DEFAULT 'local',
    local_path TEXT,
    github_repo_url TEXT,
    last_synced_at TIMESTAMPTZ,
    status VARCHAR(32) DEFAULT 'synced',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Notes (Document metadata & content)
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    vault_id UUID REFERENCES vaults(id) ON DELETE SET NULL,
    file_path TEXT NOT NULL,
    title VARCHAR(255) NOT NULL,
    tags TEXT[] DEFAULT '{}',
    frontmatter JSONB DEFAULT '{}',
    content_hash VARCHAR(64),
    raw_content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, file_path)
);

-- 6. Note Chunks with vector(384) embeddings
CREATE TABLE IF NOT EXISTS note_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(384),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for note_chunks
CREATE INDEX IF NOT EXISTS idx_note_chunks_embedding 
ON note_chunks USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_note_chunks_tenant ON note_chunks(tenant_id, note_id);

-- 7. Note Links (for Graph Traversal & Backlinks)
CREATE TABLE IF NOT EXISTS note_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    source_note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    target_note_title TEXT NOT NULL,
    target_note_id UUID REFERENCES notes(id) ON DELETE SET NULL,
    link_type VARCHAR(32) DEFAULT 'wikilink',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_note_links_tenant ON note_links(tenant_id, source_note_id);

-- 8. Conversations
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) DEFAULT 'New Conversation',
    model VARCHAR(128) DEFAULT 'gemma4:31b-cloud',
    provider VARCHAR(64) DEFAULT 'ollama',
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL,
    content TEXT NOT NULL,
    sources JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);

-- 10. Commands Repository
CREATE TABLE IF NOT EXISTS commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    template TEXT NOT NULL,
    language VARCHAR(32) DEFAULT 'bash',
    parameters JSONB DEFAULT '[]',
    tags TEXT[] DEFAULT '{}',
    filepath TEXT,
    filename TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
