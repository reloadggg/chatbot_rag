from fastapi import FastAPI, Query, UploadFile, File, HTTPException, Form, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from app.settings import settings, print_env_status
from app.rag import rag_pipeline
from app.document_processor import document_processor
from app.gemini_routes import router as gemini_router
from app.auth import auth_manager
from app.user_config import user_config_manager, UserConfig
import json
import asyncio
from typing import Any, Dict, List, Optional
from pathlib import Path

app = FastAPI(title=settings.app_name)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allow_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    question: str

class DocumentInfo(BaseModel):
    file_id: str
    filename: str
    file_size: int
    created_at: float
    text_length: Optional[int] = None
    chunks_count: Optional[int] = None
    status: str

class LoginRequest(BaseModel):
    password: str
    provider: str = "env"  # env, openai, gemini

class GuestLoginRequest(BaseModel):
    llm_provider: str
    llm_model: str
    llm_api_key: str
    llm_base_url: Optional[str] = None
    embedding_provider: str
    embedding_model: str
    embedding_api_key: str
    embedding_base_url: Optional[str] = None

class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user_type: str
    config: Dict[str, Any]
    providers: Dict[str, Any]

# 依赖函数
def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """获取当前用户"""
    if not authorization:
        raise HTTPException(status_code=401, detail="未提供认证信息")
    
    try:
        # 提取Bearer token
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="无效的认证方案")
        
        # 验证token
        token_data = auth_manager.verify_token(token)
        if not token_data:
            raise HTTPException(status_code=401, detail="无效的认证令牌")
        
        return token_data
    except Exception:
        raise HTTPException(status_code=401, detail="认证失败")

def get_user_config(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """获取用户配置"""
    return auth_manager.get_user_api_config(current_user)

def get_current_user_optional(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    """尽量获取当前用户，失败返回None"""
    if not authorization:
        return None
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            return None
        return auth_manager.verify_token(token)
    except Exception:
        return None

def get_current_user_optional(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    if not authorization:
        return None
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            return None
        return auth_manager.verify_token(token)
    except Exception:
        return None

# ===== 认证相关API =====

@app.post("/auth/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """用户登录"""
    try:
        # 验证系统密码
        if auth_manager.validate_system_password(request.password):
            # 创建系统用户令牌
            access_token = auth_manager.create_system_token()
            
            # 获取系统配置
            system_config = auth_manager.get_user_api_config({
                "user_type": "system",
                "provider": request.provider
            })
            
            return AuthResponse(
                access_token=access_token,
                token_type="bearer",
                user_type="system",
                config=system_config,
                providers={
                    "llm_providers": [
                        {
                            "name": "openai",
                            "models": ["gpt-4o-mini", "gpt-4o"],
                            "available": bool(system_config.get("llm_api_key"))
                        }
                    ],
                    "embedding_providers": [
                        {
                            "name": "openai",
                            "models": ["text-embedding-3-small"],
                            "available": bool(system_config.get("embedding_api_key"))
                        }
                    ]
                }
            )
        else:
            raise HTTPException(status_code=401, detail="密码错误")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 登录失败: {str(e)}")
        raise HTTPException(status_code=500, detail="登录失败")

@app.post("/auth/guest", response_model=AuthResponse)
async def guest_login(request: GuestLoginRequest):
    """游客登录"""
    try:
        # 验证游客配置
        config_data = request.dict()
        errors = user_config_manager.validate_provider_config(config_data)
        
        if errors:
            raise HTTPException(status_code=400, detail=f"配置验证失败: {errors}")
        
        # 创建游客会话
        import uuid
        session_id = str(uuid.uuid4())
        
        # 创建游客配置
        guest_config = user_config_manager.create_user_config(config_data)
        
        # 创建游客令牌
        access_token = auth_manager.create_guest_token(session_id, guest_config.__dict__)
        
        # 获取提供商信息
        providers_info = {
            "llm_providers": [
                {
                    "name": "openai",
                    "models": ["gpt-4o-mini", "gpt-4o"],
                    "available": guest_config.llm_provider == "openai" and bool(guest_config.llm_api_key)
                },
                {
                    "name": "gemini",
                    "models": ["gemini-2.0-flash-exp", "gemini-1.5-flash"],
                    "available": guest_config.llm_provider == "gemini" and bool(guest_config.llm_api_key)
                }
            ],
            "embedding_providers": [
                {
                    "name": "openai",
                    "models": ["text-embedding-3-small"],
                    "available": guest_config.embedding_provider == "openai" and bool(guest_config.embedding_api_key)
                },
                {
                    "name": "gemini",
                    "models": ["models/embedding-001"],
                    "available": guest_config.embedding_provider == "gemini" and bool(guest_config.embedding_api_key)
                }
            ]
        }
        
        return AuthResponse(
            access_token=access_token,
            token_type="bearer",
            user_type="guest",
            config=guest_config.__dict__,
            providers=providers_info
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 游客登录失败: {str(e)}")
        raise HTTPException(status_code=500, detail="游客登录失败")

@app.get("/auth/config")
async def get_auth_config(current_user: Dict[str, Any] = Depends(get_current_user)):
    """获取当前用户的API配置"""
    try:
        config = auth_manager.get_user_api_config(current_user)
        return {
            "user_type": current_user.get("user_type"),
            "config": config,
            "providers": {
                "llm_providers": [
                    {
                        "name": "openai",
                        "models": ["gpt-4o-mini", "gpt-4o"],
                        "available": bool(config.get("llm_api_key"))
                    },
                    {
                        "name": "gemini",
                        "models": ["gemini-2.0-flash-exp", "gemini-1.5-flash"],
                        "available": bool(config.get("llm_api_key"))
                    }
                ],
                "embedding_providers": [
                    {
                        "name": "openai",
                        "models": ["text-embedding-3-small"],
                        "available": bool(config.get("embedding_api_key"))
                    },
                    {
                        "name": "gemini",
                        "models": ["models/embedding-001"],
                        "available": bool(config.get("embedding_api_key"))
                    }
                ]
            }
        }
    except Exception as e:
        print(f"❌ 获取用户配置失败: {str(e)}")
        raise HTTPException(status_code=500, detail="获取用户配置失败")

@app.get("/auth/status")
async def get_auth_status():
    """获取认证系统状态"""
    return {
        "system_mode_enabled": auth_manager.is_system_mode_enabled(),
        "auth_required": True,  # 总是需要认证
        "supported_modes": ["system", "guest"]
    }

@app.get("/providers")
async def get_providers(current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    """获取AI提供商信息（游客可访问）"""
    try:
        base_config = auth_manager.get_user_api_config(current_user or {"user_type": "guest"})
        return {
            "llm_providers": [
                {
                    "name": "openai",
                    "models": ["gpt-4o-mini", "gpt-4o"],
                    "available": bool(base_config.get("llm_api_key"))
                },
                {
                    "name": "gemini",
                    "models": ["gemini-2.0-flash-exp", "gemini-1.5-flash"],
                    "available": bool(base_config.get("llm_api_key"))
                }
            ],
            "embedding_providers": [
                {
                    "name": "openai",
                    "models": ["text-embedding-3-small"],
                    "available": bool(base_config.get("embedding_api_key"))
                },
                {
                    "name": "gemini",
                    "models": ["models/embedding-001"],
                    "available": bool(base_config.get("embedding_api_key"))
                }
            ],
            "current_config": {
                "llm_provider": base_config.get("llm_provider"),
                "llm_model": base_config.get("llm_model"),
                "embedding_provider": base_config.get("embedding_provider"),
                "embedding_model": base_config.get("embedding_model"),
            }
        }
    except Exception as e:
        print(f"❌ 获取提供商信息失败: {str(e)}")
        raise HTTPException(status_code=500, detail="获取提供商信息失败")

# ===== 受保护的API（需要认证） =====

@app.get("/healthz", dependencies=[Depends(get_current_user)])
async def health_check(current_user: Dict[str, Any] = Depends(get_current_user)):
    """系统健康检查（需要认证）"""
    return {
        "status": "ok",
        "env": settings.env,
        "embedding_model": settings.embedding_model,
        "llm_model": settings.llm_model,
        "message": "系统运行正常",
        "user_type": current_user.get("user_type"),
        "providers": {
            "llm": settings.llm_provider,
            "embedding": settings.embedding_provider,
            "gemini_available": rag_pipeline.is_gemini_available()
        }
    }

@app.post("/query", dependencies=[Depends(get_current_user)])
async def query_once(
    request: QueryRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    user_config: Dict[str, Any] = Depends(get_user_config)
):
    """单次查询（需要认证）"""
    try:
        # 使用用户的配置创建RAG实例
        # 这里需要动态创建RAG实例，而不是使用全局实例
        # 为了简化，我们暂时使用全局配置，后续可以优化
        answer = rag_pipeline.query(request.question)
        return {
            "question": request.question,
            "answer": answer,
            "status": "success",
            "provider": rag_pipeline.provider or settings.llm_provider,
            "user_type": current_user.get("user_type")
        }
    except Exception as e:
        return {
            "question": request.question,
            "answer": f"处理问题时出现错误: {str(e)}",
            "status": "error",
            "user_type": current_user.get("user_type")
        }

@app.get("/stream", dependencies=[Depends(get_current_user)])
async def stream_query(
    question: str = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
    user_config: Dict[str, Any] = Depends(get_user_config)
):
    """流式查询（需要认证）"""
    async def generate():
        try:
            for chunk in rag_pipeline.stream_query(question):
                yield f"data: {json.dumps({'chunk': chunk}, ensure_ascii=False)}\n\n"
                await asyncio.sleep(0.01)  # 小延迟确保流式效果
            yield f"data: {json.dumps({'status': 'done'}, ensure_ascii=False)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

# ===== 文件上传和管理API（需要认证） =====

@app.post("/upload", dependencies=[Depends(get_current_user)])
async def upload_file(
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    process: bool = Form(True),
    current_user: Dict[str, Any] = Depends(get_current_user),
    user_config: Dict[str, Any] = Depends(get_user_config)
):
    """上传文件到知识库（需要认证）"""
    try:
        # 检查文件类型
        allowed_extensions = {'.pdf', '.txt', '.md', '.json'}
        file_extension = Path(file.filename).suffix.lower()
        
        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=400, 
                detail=f"不支持的文件类型。支持的类型: {', '.join(allowed_extensions)}"
            )
        
        # 检查文件大小 (最大10MB)
        file_content = await file.read()
        if len(file_content) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=400, 
                detail="文件大小超过10MB限制"
            )
        
        print(f"📤 正在上传文件: {file.filename}")
        
        # 处理文件
        result = document_processor.process_file(
            file_content, 
            file.filename,
            {"description": description} if description else {}
        )
        
        if result["status"] == "error":
            raise HTTPException(status_code=500, detail=result["error"])
        
        # 如果要求处理，添加到向量数据库
        if process and result["chunks"]:
            success = rag_pipeline.add_documents(result["chunks"])
            if success:
                print(f"✅ 文件已添加到知识库: {file.filename}")
            else:
                print(f"⚠️  文件添加到知识库失败: {file.filename}")
        
        return {
            "message": "文件上传成功",
            "file_id": result["file_id"],
            "filename": result["filename"],
            "text_length": result["text_length"],
            "chunks_count": result["chunks_count"],
            "processed": process,
            "status": "success",
            "provider": rag_pipeline.provider or settings.llm_provider,
            "user_type": current_user.get("user_type")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 文件上传失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"文件上传失败: {str(e)}")

# 添加Gemini路由（也需要认证）
app.include_router(gemini_router, dependencies=[Depends(get_current_user)])

# 添加Path导入
from pathlib import Path

if __name__ == "__main__":
    print_env_status()
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.port)
