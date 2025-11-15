from fastapi import FastAPI, Query, UploadFile, File, HTTPException, Form, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from app.settings import settings, print_env_status
from app.rag import rag_pipeline
from app.document_processor import document_processor
from app.gemini_routes import router as gemini_router
from app.auth import auth_manager
from app.model_registry import model_registry
from app.conversation_store import conversation_store
import asyncio
from typing import Any, Dict, List, Optional
from pathlib import Path
from dataclasses import asdict
import json
import uuid

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
    session_id: Optional[str] = None
    llm_provider: Optional[str] = None
    llm_model: Optional[str] = None
    embedding_provider: Optional[str] = None
    embedding_model: Optional[str] = None

class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user_type: str
    config: Dict[str, Any]
    providers: Dict[str, Any]
    session_id: Optional[str] = None
    expires_at: Optional[str] = None


class ConversationSummary(BaseModel):
    session_id: str
    title: str
    user_type: str
    created_at: float
    updated_at: float


class ConversationMessageModel(BaseModel):
    role: str
    content: str
    created_at: float


class RenameConversationRequest(BaseModel):
    title: str



# ===== Helper functions =====


def sanitize_config(config: Dict[str, Any]) -> Dict[str, Any]:
    return {
        key: value
        for key, value in config.items()
        if not key.endswith("api_key")
    }


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


def ensure_session_access(session_id: str, current_user: Dict[str, Any]):
    user_type = current_user.get("user_type")
    if user_type == "guest":
        token_session = current_user.get("session_id")
        if not token_session or token_session != session_id:
            raise HTTPException(status_code=403, detail="无权访问该会话")

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
            
            providers_payload = model_registry.build_provider_payload(system_config)

            return AuthResponse(
                access_token=access_token,
                token_type="bearer",
                user_type="system",
                config=sanitize_config(system_config),
                providers=providers_payload,
                session_id=None,
                expires_at=None
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
        session_id = request.session_id
        existing_session = None

        if session_id:
            existing_session = auth_manager.get_guest_session(session_id)
            if not existing_session:
                raise HTTPException(status_code=404, detail="找不到对应的临时会话或已过期")

        if not session_id:
            session_id = str(uuid.uuid4())

        if existing_session:
            guest_config = existing_session.api_config
            session_result = auth_manager.create_guest_session(session_id, guest_config)
        else:
            llm_provider = (request.llm_provider or settings.llm_provider or "openai").lower()
            embedding_provider = (request.embedding_provider or settings.embedding_provider or "openai").lower()

            if llm_provider not in {"openai", "gemini"}:
                raise HTTPException(status_code=400, detail="暂不支持该语言模型提供商")
            if embedding_provider not in {"openai", "gemini"}:
                raise HTTPException(status_code=400, detail="暂不支持该嵌入提供商")

            guest_config = {
                "llm_provider": llm_provider,
                "llm_model": request.llm_model
                or (settings.gemini_model if llm_provider == "gemini" else settings.llm_model),
                "llm_api_key": settings.gemini_api_key if llm_provider == "gemini" else settings.llm_api_key,
                "llm_base_url": settings.gemini_base_url if llm_provider == "gemini" else settings.llm_base_url,
                "embedding_provider": embedding_provider,
                "embedding_model": request.embedding_model
                or ("models/embedding-001" if embedding_provider == "gemini" else settings.embedding_model),
                "embedding_api_key": settings.gemini_api_key if embedding_provider == "gemini" else settings.embedding_api_key,
                "embedding_base_url": settings.gemini_base_url if embedding_provider == "gemini" else settings.embedding_base_url,
                "session_id": session_id,
                "user_type": "guest",
            }

            session_result = auth_manager.create_guest_session(session_id, guest_config)

        providers_info = model_registry.build_provider_payload(guest_config)

        return AuthResponse(
            access_token=session_result["access_token"],
            token_type="bearer",
            user_type="guest",
            config=sanitize_config(guest_config),
            providers=providers_info,
            session_id=session_result["session_id"],
            expires_at=session_result["expires_at"].isoformat()
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
        providers_payload = model_registry.build_provider_payload(config)
        response = {
            "user_type": current_user.get("user_type"),
            "config": sanitize_config(config),
            "providers": providers_payload,
        }

        if current_user.get("user_type") == "guest":
            session_id = current_user.get("session_id")
            if session_id:
                session = auth_manager.get_guest_session(session_id)
                if session:
                    response["session"] = {
                        "session_id": session.session_id,
                        "expires_at": session.expires_at.isoformat(),
                    }

        return response
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
        base_user = current_user or {"user_type": "system"}
        base_config = auth_manager.get_user_api_config(base_user)
        providers_payload = model_registry.build_provider_payload(base_config)
        sanitized = sanitize_config(base_config)
        return {
            **providers_payload,
            "current_config": {
                "llm_provider": sanitized.get("llm_provider"),
                "llm_model": sanitized.get("llm_model"),
                "embedding_provider": sanitized.get("embedding_provider"),
                "embedding_model": sanitized.get("embedding_model"),
            }
        }
    except Exception as e:
        print(f"❌ 获取提供商信息失败: {str(e)}")
        raise HTTPException(status_code=500, detail="获取提供商信息失败")


@app.get("/sessions", response_model=List[ConversationSummary])
async def list_conversations_endpoint(current_user: Dict[str, Any] = Depends(get_current_user)):
    user_type = current_user.get("user_type")
    if user_type == "guest":
        session_id = current_user.get("session_id")
        if not session_id:
            return []
        conversation = conversation_store.get_conversation(session_id)
        if not conversation:
            return []
        return [ConversationSummary(**conversation.__dict__)]

    conversations = conversation_store.list_conversations()
    return [ConversationSummary(**conv.__dict__) for conv in conversations]


@app.get("/sessions/{session_id}/messages", response_model=List[ConversationMessageModel])
async def get_conversation_messages(session_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    ensure_session_access(session_id, current_user)
    messages = conversation_store.get_messages(session_id)
    return [ConversationMessageModel(**msg.__dict__) for msg in messages]


@app.post("/sessions/{session_id}/rename", response_model=ConversationSummary)
async def rename_conversation(session_id: str, payload: RenameConversationRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    ensure_session_access(session_id, current_user)
    conversation_store.update_title(session_id, payload.title)
    conversation = conversation_store.get_conversation(session_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="会话不存在")
    return ConversationSummary(**conversation.__dict__)


@app.delete("/sessions/{session_id}")
async def delete_conversation_endpoint(session_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    ensure_session_access(session_id, current_user)
    conversation_store.delete_conversation(session_id)
    return {"status": "deleted", "session_id": session_id}

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
        answer, provider = rag_pipeline.query(request.question, user_config)
        return {
            "question": request.question,
            "answer": answer,
            "status": "success",
            "provider": provider,
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
    session_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user),
    user_config: Dict[str, Any] = Depends(get_user_config)
):
    """流式查询（需要认证）"""
    session_reference = session_id or current_user.get("session_id")
    user_type = current_user.get("user_type", "guest")

    if session_reference:
        conversation_store.append_message(session_reference, "user", question, user_type)

    assistant_chunks: List[str] = []

    async def generate():
        try:
            for chunk in rag_pipeline.stream_query(question, user_config):
                if chunk:
                    assistant_chunks.append(chunk)
                yield f"data: {json.dumps({'chunk': chunk}, ensure_ascii=False)}\n\n"
                await asyncio.sleep(0.01)  # 小延迟确保流式效果
            yield f"data: {json.dumps({'status': 'done'}, ensure_ascii=False)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"
        finally:
            if session_reference and assistant_chunks:
                conversation_store.append_message(
                    session_reference,
                    "assistant",
                    "".join(assistant_chunks),
                    user_type,
                )

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
        
        # 检查文件大小
        file_content = await file.read()
        user_type = current_user.get("user_type")
        size_limit = 50 * 1024 * 1024 if user_type == "guest" else None

        if size_limit is not None and len(file_content) > size_limit:
            raise HTTPException(
                status_code=400,
                detail="游客模式单个文件最大支持50MB"
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

        provider = user_config.get("llm_provider") or settings.llm_provider

        return {
            "message": "文件上传成功",
            "file_id": result["file_id"],
            "filename": result["filename"],
            "text_length": result["text_length"],
            "chunks_count": result["chunks_count"],
            "processed": process,
            "status": "success",
            "provider": provider,
            "user_type": current_user.get("user_type")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 文件上传失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"文件上传失败: {str(e)}")

# 添加Gemini路由（也需要认证）
@app.get("/documents", response_model=List[DocumentInfo], dependencies=[Depends(get_current_user)])
async def list_documents(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """列出上传的文档（需要认证）"""
    files = document_processor.list_files()
    documents = []
    for item in files:
        documents.append(DocumentInfo(
            file_id=item.get("file_id", ""),
            filename=item.get("filename", ""),
            file_size=item.get("file_size", 0),
            created_at=item.get("created_at", 0.0),
            text_length=item.get("text_length"),
            chunks_count=item.get("chunks_count"),
            status=item.get("status", "stored")
        ))
    return documents


@app.get("/documents/stats", dependencies=[Depends(get_current_user)])
async def document_stats(current_user: Dict[str, Any] = Depends(get_current_user)):
    """获取文档统计信息（需要认证）"""
    files = document_processor.list_files()
    total_size = sum(file.get("file_size", 0) for file in files)
    vector_stats = rag_pipeline.get_document_stats()

    return {
        "total_files": len(files),
        "total_size": total_size,
        "vector_db_stats": vector_stats,
        "files": files,
    }


@app.delete("/documents/{file_id}", dependencies=[Depends(get_current_user)])
async def delete_document(
    file_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """删除指定文档（需要认证）"""
    deleted = document_processor.delete_file(file_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="未找到指定文件")

    rag_pipeline.delete_documents(file_id)
    return {"status": "success", "file_id": file_id}


app.include_router(gemini_router, dependencies=[Depends(get_current_user)])

# 添加Path导入
from pathlib import Path

if __name__ == "__main__":
    print_env_status()
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.port)
