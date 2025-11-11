from pydantic_settings import BaseSettings

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

    top_k: int = 24
    max_tokens: int = 800
    temperature: float = 0.3
    allow_origins: str = "http://localhost:3000"

    class Config:
        env_file = ".env"

settings = Settings()

def print_env_status():
    print(f"🌏 当前环境: {settings.env}")
    print(f"💡 使用嵌入模型: {settings.embedding_model}")
    print(f"🧠 使用语言模型: {settings.llm_model}")