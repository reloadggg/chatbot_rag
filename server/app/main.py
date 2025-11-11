from fastapi import FastAPI, Query, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from app.settings import settings, print_env_status
from app.rag import rag_pipeline
from app.document_processor import document_processor
import json
import asyncio
from typing import List, Optional

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

@app.get("/healthz")
async def health_check():
    return {
        "status": "ok",
        "env": settings.env,
        "embedding_model": settings.embedding_model,
        "llm_model": settings.llm_model,
        "message": "系统运行正常"
    }

@app.post("/query")
async def query_once(request: QueryRequest):
    try:
        answer = rag_pipeline.query(request.question)
        return {
            "question": request.question,
            "answer": answer,
            "status": "success"
        }
    except Exception as e:
        return {
            "question": request.question,
            "answer": f"处理问题时出现错误: {str(e)}",
            "status": "error"
        }

@app.get("/stream")
async def stream_query(question: str = Query(...)):
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

# ===== 文件上传和管理API =====

@app.post("/upload", response_model=Dict[str, Any])
async def upload_file(
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    process: bool = Form(True)
):
    """上传文件到知识库"""
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
            "status": "success"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 文件上传失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"文件上传失败: {str(e)}")

@app.get("/documents", response_model=List[DocumentInfo])
async def list_documents():
    """获取已上传的文档列表"""
    try:
        files = document_processor.list_files()
        
        # 转换为响应格式
        documents = []
        for file_info in files:
            # 尝试获取额外的处理信息
            # 这里可以扩展为从数据库或元数据文件读取
            documents.append(DocumentInfo(
                file_id=file_info["file_id"],
                filename=file_info["filename"],
                file_size=file_info["file_size"],
                created_at=file_info["created_at"],
                status="processed"  # 假设已处理
            ))
        
        return documents
        
    except Exception as e:
        print(f"❌ 获取文档列表失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取文档列表失败: {str(e)}")

@app.delete("/documents/{file_id}")
async def delete_document(file_id: str):
    """删除指定文档"""
    try:
        success = document_processor.delete_file(file_id)
        
        if success:
            # 这里应该也从向量数据库中删除相关文档
            # 需要实现向量数据库的删除功能
            return {"message": "文档删除成功", "file_id": file_id, "status": "success"}
        else:
            raise HTTPException(status_code=404, detail="未找到指定文档")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 文档删除失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"文档删除失败: {str(e)}")

@app.get("/documents/stats")
async def get_document_stats():
    """获取文档统计信息"""
    try:
        # 获取文件列表统计
        files = document_processor.list_files()
        
        # 获取向量数据库统计
        vector_stats = rag_pipeline.get_document_stats()
        
        return {
            "total_files": len(files),
            "total_size": sum(f["file_size"] for f in files),
            "vector_db_stats": vector_stats,
            "files": [
                {
                    "file_id": f["file_id"],
                    "filename": f["filename"],
                    "file_size": f["file_size"],
                    "created_at": f["created_at"]
                }
                for f in files
            ]
        }
        
    except Exception as e:
        print(f"❌ 获取统计信息失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取统计信息失败: {str(e)}")

# 添加Path导入
from pathlib import Path

if __name__ == "__main__":
    print_env_status()
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.port)