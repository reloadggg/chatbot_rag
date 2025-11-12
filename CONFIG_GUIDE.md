# 🔧 API配置指南

## 🎯 配置说明

RAG知识库机器人支持多种API提供商和模型配置，您需要设置相应的API密钥和基础URL。

## 📋 配置文件位置

主要配置文件：`/mnt/d/codex/rag-chatbot/server/.env`

## 🔑 API密钥设置

### 1. OpenAI 配置（默认）
```env
# 嵌入模型配置
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_API_KEY=sk-your-openai-api-key-here
EMBEDDING_BASE_URL=https://api.openai.com/v1

# 语言模型配置
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
LLM_API_KEY=sk-your-openai-api-key-here
LLM_BASE_URL=https://api.openai.com/v1
```

### 2. 其他OpenAI兼容API配置
```env
# 嵌入模型配置
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_API_KEY=your-api-key
EMBEDDING_BASE_URL=https://your-api-provider.com/v1

# 语言模型配置
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
LLM_API_KEY=your-api-key
LLM_BASE_URL=https://your-api-provider.com/v1
```

### 3. Azure OpenAI 配置
```env
# 嵌入模型配置
EMBEDDING_PROVIDER=azure
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_API_KEY=your-azure-api-key
EMBEDDING_BASE_URL=https://your-resource.openai.azure.com/

# 语言模型配置
LLM_PROVIDER=azure
LLM_MODEL=gpt-4o-mini
LLM_API_KEY=your-azure-api-key
LLM_BASE_URL=https://your-resource.openai.azure.com/
```

### 4. 其他OpenAI兼容API
```env
# 例如：智普AI、月之暗面等
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_API_KEY=your-api-key
EMBEDDING_BASE_URL=https://api.provider.com/v1

LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
LLM_API_KEY=your-api-key
LLM_BASE_URL=https://api.provider.com/v1
```

## 🗃️ 向量数据库配置

### Chroma（默认，本地）
```env
VECTOR_DB=chroma
VECTOR_DB_PATH=./data/chroma
```

### Qdrant（云服务和本地）
```env
VECTOR_DB=qdrant
QDRANT_URL=https://your-qdrant-url.cloud.qdrant.io
QDRANT_API_KEY=your-qdrant-api-key
```

## ⚙️ 模型参数配置

```env
# 检索参数
TOP_K=24              # 检索结果数量

# 生成参数
MAX_TOKENS=800        # 最大token数
TEMPERATURE=0.3       # 温度参数（0-1，越高越随机）
```

## 📝 配置步骤

### 1. 复制环境变量模板
```bash
cd /mnt/d/codex/rag-chatbot/server
cp .env.example .env
```

### 2. 编辑配置文件
```bash
nano .env  # 或使用您喜欢的编辑器
```

### 3. 修改API密钥和相关配置
将 `your-api-key-here` 替换为您的实际API密钥

### 4. 重启服务
```bash
# 停止现有服务
pkill -f uvicorn

# 重新启动
source .venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

## 🔍 验证配置

### 检查配置加载
```bash
curl http://localhost:8001/healthz
```

应该返回您配置的模型信息：
```json
{
  "status": "ok",
  "env": "dev",
  "embedding_model": "text-embedding-3-small",
  "llm_model": "gpt-4o-mini",
  "message": "系统运行正常"
}
```

### 测试API调用
```bash
# 测试查询
curl -X POST "http://localhost:8001/query" \
  -H "Content-Type: application/json" \
  -d '{"question": "你好"}'
```

## ⚠️ 注意事项

1. **API密钥安全**
   - 不要将 `.env` 文件提交到Git
   - 定期更换API密钥
   - 使用环境变量而非硬编码

2. **网络配置**
   - 确保API密钥对应的服务可访问
   - 国内用户建议使用代理或国内服务商

3. **成本控制**
   - 监控API使用量
   - 设置合理的MAX_TOKENS
   - 选择合适的模型

## 🛠️ 常见问题

### Q: API调用返回401错误
A: API密钥无效或已过期，请检查密钥是否正确

### Q: 网络连接超时
A: 检查BASE_URL是否正确，国内网络可能需要代理

### Q: 模型不支持错误
A: 确认您的API账户是否有权限使用指定模型

### Q: 服务启动失败
A: 检查 `.env` 文件格式是否正确，没有语法错误

## 📞 支持

如果您遇到配置问题：
1. 检查服务日志 `server/server.log`
2. 验证网络连接
3. 确认API密钥权限
4. 查看详细错误信息

---

**配置完成后，您的RAG知识库机器人就可以使用真实的AI模型了！🎉**