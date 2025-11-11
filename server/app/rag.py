from app.settings import settings
from app.document_processor import document_processor
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_chroma import Chroma
from langchain_qdrant import Qdrant
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
import chromadb
from qdrant_client import QdrantClient

class RAGPipeline:
    def __init__(self):
        self.settings = settings
        self.embeddings = None
        self.vectorstore = None
        self.llm = None
        self.chain = None
        self._initialize_components()
    
    def _initialize_components(self):
        try:
            print(f"🌏 当前环境: {settings.env}")
            print(f"💡 使用嵌入模型: {settings.embedding_model}")
            print(f"🧠 使用语言模型: {settings.llm_model}")
            
            # 初始化嵌入模型
            self.embeddings = OpenAIEmbeddings(
                model=self.settings.embedding_model,
                api_key=self.settings.embedding_api_key,
                base_url=self.settings.__dict__.get('EMBEDDING_BASE_URL', None)
            )
            print("✅ 嵌入模型加载成功")
            
            # 初始化向量存储
            if self.settings.vector_db == "chroma":
                self.vectorstore = Chroma(
                    collection_name="knowledge_base",
                    embedding_function=self.embeddings,
                    persist_directory=self.settings.vector_db_path
                )
            else:  # qdrant
                client = QdrantClient(
                    url=self.settings.qdrant_url,
                    api_key=self.settings.qdrant_api_key
                )
                self.vectorstore = Qdrant(
                    client=client,
                    collection_name="knowledge_base",
                    embeddings=self.embeddings
                )
            print("✅ 向量存储初始化成功")
            
            # 初始化语言模型
            self.llm = ChatOpenAI(
                model=self.settings.llm_model,
                api_key=self.settings.llm_api_key,
                base_url=self.settings.__dict__.get('LLM_BASE_URL', None),
                temperature=self.settings.temperature,
                max_tokens=self.settings.max_tokens
            )
            print("✅ 语言模型加载成功")
            
            # 创建RAG链
            self._create_rag_chain()
            print("✅ RAG管道初始化完成")
            
        except Exception as e:
            print(f"❌ 初始化失败: {str(e)}")
            raise
    
    def _create_rag_chain(self):
        template = """基于以下上下文回答用户的问题：
        
        上下文：
        {context}
        
        问题：{question}
        
        请提供准确、简洁的中文回答。"""
        
        prompt = ChatPromptTemplate.from_template(template)
        
        self.chain = (
            {"context": self.vectorstore.as_retriever(search_kwargs={"k": self.settings.top_k}), "question": RunnablePassthrough()}
            | prompt
            | self.llm
            | StrOutputParser()
        )
    
    def add_documents(self, documents):
        """添加文档到向量数据库"""
        try:
            print(f"📚 正在添加 {len(documents)} 个文档片段到向量数据库...")
            
            # 添加文档到向量存储
            self.vectorstore.add_documents(documents)
            
            print(f"✅ 文档添加成功")
            return True
            
        except Exception as e:
            print(f"❌ 文档添加失败: {str(e)}")
            return False
    
    def query(self, question: str) -> str:
        """单次查询"""
        try:
            print(f"📚 正在检索相似段落...")
            answer = self.chain.invoke(question)
            print(f"✅ 已生成回答")
            return answer
        except Exception as e:
            print(f"❌ 查询失败: {str(e)}")
            return f"抱歉，处理问题时出现错误: {str(e)}"
    
    def stream_query(self, question: str):
        """流式查询"""
        try:
            print(f"📚 正在检索相似段落...")
            print(f"🧠 正在调用语言模型生成回答...")
            for chunk in self.chain.stream(question):
                yield chunk
            print(f"✅ 流式回答生成完成")
        except Exception as e:
            print(f"❌ 流式查询失败: {str(e)}")
            yield f"抱歉，处理问题时出现错误: {str(e)}"
    
    def get_document_stats(self) -> dict:
        """获取文档统计信息"""
        try:
            # 获取向量存储中的文档数量
            if hasattr(self.vectorstore, '_collection'):
                count = self.vectorstore._collection.count()
            else:
                # 通过搜索空查询来估算
                results = self.vectorstore.similarity_search("", k=1)
                count = len(results) if results else 0
            
            return {
                "document_count": count,
                "vector_db": self.settings.vector_db,
                "embedding_model": self.settings.embedding_model,
                "status": "active"
            }
        except Exception as e:
            print(f"❌ 获取文档统计失败: {str(e)}")
            return {
                "document_count": 0,
                "error": str(e),
                "status": "error"
            }

# 全局RAG管道实例
rag_pipeline = RAGPipeline()