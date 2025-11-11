import os
import uuid
from typing import List, Dict, Any
from pathlib import Path
import PyPDF2
import json
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from app.settings import settings

class DocumentProcessor:
    def __init__(self):
        self.upload_dir = Path("uploads")
        self.upload_dir.mkdir(exist_ok=True)
        
        # 文本分割器配置
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
            separators=["\n\n", "\n", " ", ""]
        )
    
    def save_uploaded_file(self, file_content: bytes, filename: str) -> str:
        """保存上传的文件"""
        file_id = str(uuid.uuid4())
        file_extension = Path(filename).suffix.lower()
        
        # 生成安全的文件名
        safe_filename = f"{file_id}{file_extension}"
        file_path = self.upload_dir / safe_filename
        
        # 保存文件
        with open(file_path, 'wb') as f:
            f.write(file_content)
        
        return str(file_path), file_id
    
    def extract_text_from_pdf(self, file_path: str) -> str:
        """从PDF文件中提取文本"""
        text = ""
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page_num, page in enumerate(pdf_reader.pages):
                    text += page.extract_text() + "\n"
        except Exception as e:
            print(f"❌ PDF文本提取失败: {str(e)}")
            raise
        
        return text
    
    def extract_text_from_txt(self, file_path: str) -> str:
        """从文本文件中提取内容"""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                return file.read()
        except UnicodeDecodeError:
            # 尝试其他编码
            with open(file_path, 'r', encoding='gbk') as file:
                return file.read()
    
    def extract_text_from_json(self, file_path: str) -> str:
        """从JSON文件中提取内容"""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                data = json.load(file)
                # 将JSON转换为可读的文本格式
                return json.dumps(data, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"❌ JSON解析失败: {str(e)}")
            raise
    
    def extract_text(self, file_path: str, filename: str) -> str:
        """根据文件类型提取文本"""
        file_extension = Path(filename).suffix.lower()
        
        if file_extension == '.pdf':
            return self.extract_text_from_pdf(file_path)
        elif file_extension == '.txt':
            return self.extract_text_from_txt(file_path)
        elif file_extension == '.json':
            return self.extract_text_from_json(file_path)
        elif file_extension == '.md':
            return self.extract_text_from_txt(file_path)  # Markdown按文本处理
        else:
            # 默认按文本文件处理
            return self.extract_text_from_txt(file_path)
    
    def split_document(self, text: str, metadata: Dict[str, Any] = None) -> List[Document]:
        """将文档分割成 chunks"""
        if metadata is None:
            metadata = {}
        
        # 创建文档对象
        document = Document(
            page_content=text,
            metadata=metadata
        )
        
        # 使用文本分割器分割
        chunks = self.text_splitter.split_documents([document])
        
        # 为每个chunk添加额外信息
        for i, chunk in enumerate(chunks):
            chunk.metadata.update({
                "chunk_id": i,
                "chunk_total": len(chunks),
                "chunk_size": len(chunk.page_content)
            })
        
        return chunks
    
    def process_file(self, file_content: bytes, filename: str, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """处理上传的文件"""
        try:
            print(f"📄 正在处理文件: {filename}")
            
            # 保存文件
            file_path, file_id = self.save_uploaded_file(file_content, filename)
            print(f"✅ 文件已保存: {file_path}")
            
            # 提取文本
            text = self.extract_text(file_path, filename)
            print(f"📖 提取文本长度: {len(text)} 字符")
            
            # 分割文档
            chunks = self.split_document(text, {
                "filename": filename,
                "file_id": file_id,
                "file_path": file_path,
                "file_size": len(file_content),
                **(metadata or {})
            })
            
            print(f"✂️  文档分割完成: {len(chunks)} 个片段")
            
            return {
                "file_id": file_id,
                "filename": filename,
                "file_path": file_path,
                "text_length": len(text),
                "chunks_count": len(chunks),
                "chunks": chunks,
                "status": "success"
            }
            
        except Exception as e:
            print(f"❌ 文件处理失败: {str(e)}")
            # 清理已上传的文件
            if 'file_path' in locals():
                try:
                    os.remove(file_path)
                except:
                    pass
            
            return {
                "filename": filename,
                "status": "error",
                "error": str(e)
            }
    
    def delete_file(self, file_id: str) -> bool:
        """删除文件和相关数据"""
        try:
            # 查找文件
            for file_path in self.upload_dir.glob(f"{file_id}.*"):
                os.remove(file_path)
                print(f"🗑️  已删除文件: {file_path}")
                return True
            
            print(f"⚠️  未找到文件: {file_id}")
            return False
            
        except Exception as e:
            print(f"❌ 删除文件失败: {str(e)}")
            return False
    
    def list_files(self) -> List[Dict[str, Any]]:
        """列出所有上传的文件"""
        files = []
        try:
            for file_path in self.upload_dir.glob("*"):
                if file_path.is_file():
                    stat = file_path.stat()
                    file_id = file_path.stem
                    files.append({
                        "file_id": file_id,
                        "filename": file_path.name,
                        "file_size": stat.st_size,
                        "created_at": stat.st_ctime,
                        "file_path": str(file_path)
                    })
        except Exception as e:
            print(f"❌ 获取文件列表失败: {str(e)}")
        
        return files

# 全局实例
document_processor = DocumentProcessor()