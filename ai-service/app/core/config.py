import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../../.env", env_file_encoding="utf-8", extra="ignore")

    AI_PORT: int = 8000
    AI_HOST: str = "0.0.0.0"
    
    # Qdrant Vector DB
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333
    QDRANT_COLLECTION: str = "mindvault_vectors"
    
    # Embedding Configuration
    EMBEDDING_PROVIDER: str = "local"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    VECTOR_DIMENSION: int = 384
    
    # LLM Provider Configuration
    LLM_PROVIDER: str = "gemini"
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    
    # Text Chunker settings
    CHUNK_SIZE: int = 800
    CHUNK_OVERLAP: int = 150

settings = Settings()
