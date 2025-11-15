from typing import Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "RAG_知识库机器人"
    env: str = "dev"
    port: int = 8000

    vector_db: str = "chroma"
    vector_db_path: str = "./data/chroma"
    qdrant_url: str = ""
    qdrant_api_key: str = ""

    embedding_provider: str = "openai"
    embedding_model: str = "text-embedding-3-small"
    embedding_api_key: str = ""
    embedding_base_url: str = ""

    llm_provider: str = "openai"
    llm_model: str = "gpt-4o-mini"
    llm_api_key: str = ""
    llm_base_url: str = ""

    system_password: str = ""
    jwt_secret_key: str = ""
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-pro"
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta"

    top_k: Optional[int] = None
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None
    allow_origins: str = "http://localhost:3000"

    model_config = SettingsConfigDict(env_file=".env", extra="allow")

    def model_post_init(self, __context):
        self.llm_base_url = self._normalize_base_url(self.llm_base_url, "chat/completions")
        self.embedding_base_url = self._normalize_base_url(self.embedding_base_url, "embeddings")
        if self.top_k is None:
            self.top_k = 24
        if self.max_tokens is None:
            self.max_tokens = 800
        if self.temperature is None:
            self.temperature = 0.3

    @staticmethod
    def _normalize_base_url(base_url: str, endpoint_suffix: str) -> str:
        if not base_url:
            return ""
        cleaned = base_url.rstrip("/")
        suffix = "/" + endpoint_suffix.strip("/")
        if cleaned.endswith(suffix):
            cleaned = cleaned[: -len(suffix)]
        return cleaned

    @field_validator("top_k", "max_tokens", "temperature", mode="before")
    @classmethod
    def _empty_str_to_none(cls, value):
        if isinstance(value, str) and value.strip() == "":
            return None
        return value

settings = Settings()

def print_env_status():
    print(f"🌏 当前环境: {settings.env}")
    print(f"💡 使用嵌入模型: {settings.embedding_model}")
    print(f"🧠 使用语言模型: {settings.llm_model}")
