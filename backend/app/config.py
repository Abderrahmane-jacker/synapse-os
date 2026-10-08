import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OBSIDIAN_VAULT_PATH: str = "./vault"
    CHROMA_PERSIST_DIR: str = "./chroma_data"
    SQLITE_DB_PATH: str = "./nexus.db"
    POSTGRES_URL: str = "postgresql://postgres:postgres@localhost:5432/nexus_saas"
    DATABASE_BACKEND: str = "auto" # 'postgres', 'sqlite', or 'auto'
    DEFAULT_TENANT_ID: str = "00000000-0000-0000-0000-000000000001"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    DEFAULT_LLM_MODEL: str = "auto/best-coding"
    LLM_PROVIDER: str = "omniroute"
    OMNIROUTE_BASE_URL: str = "http://localhost:20128"
    OPERATOR_NAME: str = "Operator"
    AGENT_NAME: str = "Synapse"
    SECRET_KEY: str = "synapseos_neural_super_secret_jwt_key_zero_cost_saas"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
