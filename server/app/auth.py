from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.settings import settings
import secrets
import json

# 密码加密上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT配置
SECRET_KEY = settings.jwt_secret_key or secrets.token_urlsafe(32)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24小时

class AuthManager:
    def __init__(self):
        self.system_password = settings.system_password
        self.guest_sessions: Dict[str, Dict[str, Any]] = {}
        
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """验证密码"""
        return pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """获取密码哈希"""
        return pwd_context.hash(password)
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """创建访问令牌"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """验证令牌"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_type: str = payload.get("sub")
            if user_type is None:
                return None
            return payload
        except JWTError:
            return None
    
    def create_guest_session(self, session_id: str, api_config: Dict[str, Any]) -> str:
        """创建游客会话并返回访问令牌"""
        session_data = {
            "session_id": session_id,
            "user_type": "guest",
            "api_config": api_config,
            "created_at": datetime.utcnow().isoformat(),
            "expires_at": (datetime.utcnow() + timedelta(hours=24)).isoformat()
        }

        self.guest_sessions[session_id] = session_data

        # 创建JWT令牌
        token_data = {
            "sub": "guest",
            "session_id": session_id,
            "user_type": "guest",
            "api_config": api_config
        }

        token = self.create_access_token(token_data)
        session_data["access_token"] = token
        return token

    def create_guest_token(self, session_id: str, api_config: Dict[str, Any]) -> str:
        """创建游客令牌（向后兼容的包装方法）"""
        return self.create_guest_session(session_id, api_config)
    
    def get_guest_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """获取游客会话"""
        session = self.guest_sessions.get(session_id)
        if not session:
            return None
        
        # 检查是否过期
        expires_at = datetime.fromisoformat(session["expires_at"])
        if datetime.utcnow() > expires_at:
            # 清理过期会话
            del self.guest_sessions[session_id]
            return None
        
        return session
    
    def validate_system_password(self, password: str) -> bool:
        """验证系统密码"""
        if not self.system_password:
            return False  # 如果没有设置系统密码，不允许系统登录
        
        # 简单的密码验证（实际环境中应该使用哈希）
        if len(self.system_password) >= 8:  # 简单验证
            return password == self.system_password
        
        return False
    
    def create_system_token(self) -> str:
        """创建系统用户令牌"""
        token_data = {
            "sub": "system",
            "user_type": "system",
            "provider": "env",  # 使用环境变量中的配置
            "has_full_access": True
        }
        return self.create_access_token(token_data)
    
    def get_user_api_config(self, token_data: Dict[str, Any]) -> Dict[str, Any]:
        """获取用户的API配置"""
        user_type = token_data.get("user_type")
        
        if user_type == "system":
            # 系统用户使用环境变量配置
            return {
                "llm_provider": settings.llm_provider,
                "llm_model": settings.llm_model,
                "llm_api_key": settings.llm_api_key,
                "llm_base_url": settings.llm_base_url or None,
                "embedding_provider": settings.embedding_provider,
                "embedding_model": settings.embedding_model,
                "embedding_api_key": settings.embedding_api_key,
                "embedding_base_url": settings.embedding_base_url or None
            }
        elif user_type == "guest":
            # 游客用户优先使用会话中保存的配置
            session_id = token_data.get("session_id")
            if session_id:
                session = self.get_guest_session(session_id)
                if session:
                    return session.get("api_config", {})

            return token_data.get("api_config", {})
        else:
            return {}
    
    def is_system_mode_enabled(self) -> bool:
        """检查系统模式是否启用"""
        return bool(self.system_password) and len(self.system_password) >= 8
    
    def cleanup_expired_sessions(self):
        """清理过期的游客会话"""
        current_time = datetime.utcnow()
        expired_sessions = []
        
        for session_id, session in self.guest_sessions.items():
            expires_at = datetime.fromisoformat(session["expires_at"])
            if current_time > expires_at:
                expired_sessions.append(session_id)
        
        for session_id in expired_sessions:
            del self.guest_sessions[session_id]

# 全局认证管理器
auth_manager = AuthManager()
