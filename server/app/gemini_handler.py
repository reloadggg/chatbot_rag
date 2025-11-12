import os
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from langchain_google_genai import GoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_core.embeddings import Embeddings
from langchain_core.language_models import BaseLanguageModel
from app.settings import settings
import json

class GeminiHandler:
    def __init__(self):
        self.api_key = settings.gemini_api_key
        self.model_name = settings.gemini_model
        self.base_url = settings.gemini_base_url
        
        if self.api_key:
            self._initialize_gemini()
    
    def _initialize_gemini(self):
        """初始化Gemini配置"""
        try:
            genai.configure(api_key=self.api_key)
            print(f"✅ Gemini配置成功: {self.model_name}")
        except Exception as e:
            print(f"❌ Gemini配置失败: {str(e)}")
            raise
    
    def create_embeddings(self) -> Optional[Embeddings]:
        """创建Gemini嵌入模型"""
        if not self.api_key:
            return None
        
        try:
            embeddings = GoogleGenerativeAIEmbeddings(
                model="models/embedding-001",
                google_api_key=self.api_key,
                task_type="RETRIEVAL_DOCUMENT"
            )
            print("✅ Gemini嵌入模型创建成功")
            return embeddings
        except Exception as e:
            print(f"❌ Gemini嵌入模型创建失败: {str(e)}")
            return None
    
    def create_llm(self) -> Optional[BaseLanguageModel]:
        """创建Gemini语言模型"""
        if not self.api_key:
            return None
        
        try:
            llm = GoogleGenerativeAI(
                model=self.model_name,
                google_api_key=self.api_key,
                temperature=settings.temperature,
                max_output_tokens=settings.max_tokens,
                safety_settings={
                    genai.types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: genai.types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                    genai.types.HarmCategory.HARM_CATEGORY_HARASSMENT: genai.types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                    genai.types.HarmCategory.HARM_CATEGORY_HATE_SPEECH: genai.types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                    genai.types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: genai.types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                }
            )
            print(f"✅ Gemini语言模型创建成功: {self.model_name}")
            return llm
        except Exception as e:
            print(f"❌ Gemini语言模型创建失败: {str(e)}")
            return None
    
    def upload_file_to_gemini(self, file_path: str, mime_type: str = None) -> Optional[Any]:
        """上传文件到Gemini并返回文件对象"""
        if not self.api_key:
            return None
        
        try:
            # 自动检测MIME类型
            if not mime_type:
                import mimetypes
                mime_type, _ = mimetypes.guess_type(file_path)
            
            # 上传文件到Gemini
            file = genai.upload_file(file_path, mime_type=mime_type)
            print(f"✅ 文件上传到Gemini成功: {file_path}")
            return file
        except Exception as e:
            print(f"❌ 文件上传到Gemini失败: {str(e)}")
            return None
    
    def create_file_search_prompt(self, question: str, file_objects: List[Any]) -> str:
        """创建文件搜索提示"""
        prompt = f"""基于以下文档内容回答用户的问题：
        
        文档内容：
        {self._format_files_for_prompt(file_objects)}
        
        问题：{question}
        
        请基于文档内容提供准确、详细的回答。如果文档中没有相关信息，请明确说明。
        """
        return prompt
    
    def _format_files_for_prompt(self, file_objects: List[Any]) -> str:
        """格式化文件对象供提示使用"""
        formatted_content = []
        
        for i, file_obj in enumerate(file_objects, 1):
            formatted_content.append(f"文档 {i}:")
            formatted_content.append(f"文件名: {file_obj.name}")
            formatted_content.append(f"文件内容: [已上传的文件内容]")
            formatted_content.append("")
        
        return "\n".join(formatted_content)
    
    def process_with_files(self, question: str, file_paths: List[str]) -> Dict[str, Any]:
        """使用Gemini的文件搜索功能处理问题和文件"""
        if not self.api_key:
            return {
                "status": "error",
                "error": "Gemini API密钥未配置"
            }
        
        try:
            # 上传文件到Gemini
            file_objects = []
            for file_path in file_paths:
                file_obj = self.upload_file_to_gemini(file_path)
                if file_obj:
                    file_objects.append(file_obj)
            
            if not file_objects:
                return {
                    "status": "error",
                    "error": "文件上传失败"
                }
            
            # 创建提示
            prompt = self.create_file_search_prompt(question, file_objects)
            
            # 使用Gemini生成回答
            model = genai.GenerativeModel(self.model_name)
            response = model.generate_content([prompt] + file_objects)
            
            # 清理上传的文件
            for file_obj in file_objects:
                try:
                    file_obj.delete()
                except:
                    pass
            
            return {
                "status": "success",
                "answer": response.text,
                "model": self.model_name,
                "file_count": len(file_objects)
            }
            
        except Exception as e:
            print(f"❌ Gemini文件搜索处理失败: {str(e)}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    def is_available(self) -> bool:
        """检查Gemini是否可用"""
        return bool(self.api_key)

# 全局实例
gemini_handler = GeminiHandler()
