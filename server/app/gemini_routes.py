from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict, Any
from app.gemini_handler import gemini_handler
import tempfile
import os
from pathlib import Path
import mimetypes

router = APIRouter(prefix="/gemini", tags=["Gemini"])

@router.post("/upload-file", response_model=Dict[str, Any])
async def upload_file_to_gemini(
    file: UploadFile = File(...),
    question: Optional[str] = Form(None),
    process: bool = Form(True)
):
    """上传文件到Gemini并可选地进行问答"""
    if not gemini_handler.is_available():
        raise HTTPException(status_code=501, detail="Gemini API未配置")
    
    try:
        # 检查文件类型
        allowed_extensions = {'.pdf', '.txt', '.md', '.json', '.png', '.jpg', '.jpeg', '.gif', '.mp4', '.mp3', '.wav'}
        file_extension = Path(file.filename).suffix.lower()
        
        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=400, 
                detail=f"不支持的文件类型。支持的类型: {', '.join(allowed_extensions)}"
            )
        
        # 检查文件大小 (最大100MB for Gemini)
        file_content = await file.read()
        if len(file_content) > 100 * 1024 * 1024:
            raise HTTPException(
                status_code=400, 
                detail="文件大小超过100MB限制"
            )
        
        print(f"📤 正在上传文件到Gemini: {file.filename}")
        
        # 创建临时文件
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as tmp_file:
            tmp_file.write(file_content)
            tmp_file_path = tmp_file.name
        
        try:
            # 上传到Gemini
            gemini_file = gemini_handler.upload_file_to_gemini(tmp_file_path)
            
            if not gemini_file:
                raise HTTPException(status_code=500, detail="文件上传到Gemini失败")
            
            result = {
                "message": "文件上传到Gemini成功",
                "filename": file.filename,
                "file_size": len(file_content),
                "gemini_file_name": gemini_file.name,
                "gemini_file_uri": gemini_file.uri,
                "process": process
            }
            
            # 如果提供了问题，进行处理
            if question and process:
                process_result = gemini_handler.process_with_files(question, [tmp_file_path])
                result["processing_result"] = process_result
            
            return result
            
        finally:
            # 清理临时文件
            try:
                os.unlink(tmp_file_path)
            except:
                pass
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 文件上传到Gemini失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"文件上传到Gemini失败: {str(e)}")

@router.post("/process-with-files", response_model=Dict[str, Any])
async def process_with_gemini_files(
    question: str = Form(...),
    files: List[UploadFile] = File(...),
    process_type: Optional[str] = Form("qa")  # qa, summarize, extract
):
    """使用Gemini处理多个文件和问答"""
    if not gemini_handler.is_available():
        raise HTTPException(status_code=501, detail="Gemini API未配置")
    
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="最多支持10个文件")
    
    try:
        print(f"📚 正在使用Gemini处理 {len(files)} 个文件")
        
        # 创建临时文件列表
        temp_files = []
        file_paths = []
        
        try:
            # 保存所有上传的文件
            for file in files:
                # 检查文件类型
                allowed_extensions = {'.pdf', '.txt', '.md', '.json', '.png', '.jpg', '.jpeg', '.gif'}
                file_extension = Path(file.filename).suffix.lower()
                
                if file_extension not in allowed_extensions:
                    continue  # 跳过不支持的文件
                
                # 保存文件
                file_content = await file.read()
                if len(file_content) > 100 * 1024 * 1024:
                    continue  # 跳过过大的文件
                
                with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as tmp_file:
                    tmp_file.write(file_content)
                    temp_files.append(tmp_file.name)
                    file_paths.append(tmp_file.name)
            
            if not file_paths:
                raise HTTPException(status_code=400, detail="没有有效的文件可处理")
            
            # 使用Gemini处理
            result = gemini_handler.process_with_files(question, file_paths)
            
            # 添加处理类型信息
            result["process_type"] = process_type
            result["file_count"] = len(file_paths)
            result["files_processed"] = [os.path.basename(path) for path in file_paths]
            
            return result
            
        finally:
            # 清理所有临时文件
            for file_path in temp_files:
                try:
                    os.unlink(file_path)
                except:
                    pass
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Gemini文件处理失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Gemini文件处理失败: {str(e)}")

@router.get("/info", response_model=Dict[str, Any])
async def get_gemini_info():
    """获取Gemini配置信息"""
    return {
        "available": gemini_handler.is_available(),
        "model": gemini_handler.model_name if gemini_handler.is_available() else None,
        "base_url": gemini_handler.base_url if gemini_handler.is_available() else None,
        "features": [
            "文件上传",
            "多模态处理",
            "文件搜索",
            "文档问答"
        ] if gemini_handler.is_available() else []
    }

@router.get("/models", response_model=Dict[str, Any])
async def get_available_models():
    """获取可用的Gemini模型列表"""
    if not gemini_handler.is_available():
        return {"available": False, "models": []}
    
    try:
        # 获取可用的Gemini模型
        available_models = [
            "gemini-2.0-flash-exp",
            "gemini-1.5-flash",
            "gemini-1.5-flash-8b",
            "gemini-1.5-pro",
            "gemini-1.0-pro"
        ]
        
        return {
            "available": True,
            "models": available_models,
            "current_model": gemini_handler.model_name
        }
    except Exception as e:
        return {
            "available": True,
            "models": ["gemini-1.5-flash"],  # 默认模型
            "current_model": gemini_handler.model_name,
            "error": str(e)
        }

@router.delete("/cleanup", response_model=Dict[str, Any])
async def cleanup_gemini_files():
    """清理Gemini上传的文件"""
    if not gemini_handler.is_available():
        return {"status": "error", "message": "Gemini API未配置"}
    
    try:
        # 获取所有上传的文件
        files = genai.list_files()
        deleted_count = 0
        
        for file in files:
            try:
                file.delete()
                deleted_count += 1
            except:
                pass
        
        return {
            "status": "success",
            "message": f"已清理 {deleted_count} 个文件",
            "deleted_count": deleted_count
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": f"清理失败: {str(e)}"
        }