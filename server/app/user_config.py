from typing import Dict, Any, Optional
from dataclasses import dataclass
from app.settings import settings
from app.gemini_handler import gemini_handler
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_google_genai import GoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_core.language_models import BaseLanguageModel
from langchain_core.embeddings import Embeddings

@dataclass
class UserConfig:
    """用户配置数据类"""
    llm_provider: str = "openai"
    llm_model: str = "gpt-4o-mini"
    llm_api_key: str = ""
    llm_base_url: Optional[str] = None
    
    embedding_provider: str = "openai"
    embedding_model: str = "text-embedding-3-small"
    embedding_api_key: str = ""
    embedding_base_url: Optional[str] = None
    
    user_type: str = "guest"  # system, guest
    session_id: Optional[str] = None

class UserConfigManager:
    def __init__(self):
        pass
    
    def validate_provider_config(self, config: Dict[str, Any]) -> Dict[str, str]:
        """验证用户提供的API配置"""
        errors = {}
        
        # 验证LLM提供商配置
        llm_provider = config.get("llm_provider", "openai")
        llm_api_key = config.get("llm_api_key", "")
        
        if llm_provider == "openai":
            if not llm_api_key or not llm_api_key.startswith("sk-"):
                errors["llm_api_key"] = "OpenAI API密钥格式不正确"
        elif llm_provider == "gemini":
            if not llm_api_key:
                errors["llm_api_key"] = "Gemini API密钥不能为空"
        
        # 验证嵌入模型提供商配置
        embedding_provider = config.get("embedding_provider", "openai")
        embedding_api_key = config.get("embedding_api_key", "")
        
        if embedding_provider == "openai":
            if not embedding_api_key or not embedding_api_key.startswith("sk-"):
                errors["embedding_api_key"] = "OpenAI嵌入API密钥格式不正确"
        elif embedding_provider == "gemini":
            if not embedding_api_key:
                errors["embedding_api_key"] = "Gemini嵌入API密钥不能为空"
        
        # 验证BaseURL格式
        llm_base_url = config.get("llm_base_url")
        if llm_base_url and not llm_base_url.startswith("http"):
            errors["llm_base_url"] = "BaseURL格式不正确"
        
        embedding_base_url = config.get("embedding_base_url")
        if embedding_base_url and not embedding_base_url.startswith("http"):
            errors["embedding_base_url"] = "BaseURL格式不正确"
        
        return errors
    
    def create_user_config(self, config_data: Dict[str, Any]) -> UserConfig:
        """从配置数据创建用户配置对象"""
        return UserConfig(
            llm_provider=config_data.get("llm_provider", "openai"),
            llm_model=config_data.get("llm_model", "gpt-4o-mini"),
            llm_api_key=config_data.get("llm_api_key", ""),
            llm_base_url=config_data.get("llm_base_url"),
            embedding_provider=config_data.get("embedding_provider", "openai"),
            embedding_model=config_data.get("embedding_model", "text-embedding-3-small"),
            embedding_api_key=config_data.get("embedding_api_key", ""),
            embedding_base_url=config_data.get("embedding_base_url"),
            user_type=config_data.get("user_type", "guest"),
            session_id=config_data.get("session_id")
        )
    
    def create_llm(self, config: UserConfig) -> BaseLanguageModel:
        """根据用户配置创建LLM模型"""
        try:
            if config.llm_provider == "gemini":
                # 使用Gemini
                return GoogleGenerativeAI(
                    model=config.llm_model,
                    google_api_key=config.llm_api_key,
                    base_url=config.llm_base_url,
                    temperature=0.3,
                    max_output_tokens=800
                )
            else:
                # 默认使用OpenAI
                return ChatOpenAI(
                    model=config.llm_model,
                    api_key=config.llm_api_key,
                    base_url=config.llm_base_url,
                    temperature=0.3,
                    max_tokens=800
                )
        except Exception as e:
            raise Exception(f"创建LLM模型失败: {str(e)}")
    
    def create_embeddings(self, config: UserConfig) -> Embeddings:
        """根据用户配置创建嵌入模型"""
        try:
            if config.embedding_provider == "gemini":
                # 使用Gemini嵌入
                return GoogleGenerativeAIEmbeddings(
                    model="models/embedding-001",
                    google_api_key=config.embedding_api_key,
                    base_url=config.embedding_base_url,
                    task_type="RETRIEVAL_DOCUMENT"
                )
            else:
                # 默认使用OpenAI嵌入
                return OpenAIEmbeddings(
                    model=config.embedding_model,
                    api_key=config.embedding_api_key,
                    base_url=config.embedding_base_url
                )
        except Exception as e:
            raise Exception(f"创建嵌入模型失败: {str(e)}")
    
    def get_default_config(self, provider: str = "openai") -> Dict[str, Any]:
        """获取默认配置"""
        if provider == "gemini":
            return {
                "llm_provider": "gemini",
                "llm_model": settings.gemini_model or "gemini-2.5-pro",
                "llm_api_key": "",
                "llm_base_url": "https://generativelanguage.googleapis.com/v1beta",
                "embedding_provider": "gemini",
                "embedding_model": "models/embedding-001",
                "embedding_api_key": "",
                "embedding_base_url": "https://generativelanguage.googleapis.com/v1beta"
            }
        else:
            return {
                "llm_provider": "openai",
                "llm_model": "gpt-4o-mini",
                "llm_api_key": "",
                "llm_base_url": "https://api.openai.com/v1",
                "embedding_provider": "openai",
                "embedding_model": "text-embedding-3-small",
                "embedding_api_key": "",
                "embedding_base_url": "https://api.openai.com/v1"
            }
    
    def create_session_config(self, session_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建会话配置"""
        user_type = session_data.get("user_type", "guest")
        
        if user_type == "system":
            # 系统用户使用环境变量配置
            return {
                "llm_provider": "env",
                "llm_model": "env",
                "llm_api_key": "env",
                "llm_base_url": None,
                "embedding_provider": "env",
                "embedding_model": "env",
                "embedding_api_key": "env",
                "embedding_base_url": None,
                "user_type": "system"
            }
        else:
            # 游客用户使用自己的配置
            api_config = session_data.get("api_config", {})
            return {
                **api_config,
                "user_type": "guest"
            }

# 全局用户配置管理器
user_config_manager = UserConfigManager()