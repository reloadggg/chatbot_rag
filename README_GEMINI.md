# 🔍 Google Gemini 支持指南

> TL;DR：在 `server/.env` 中填入 Gemini API Key，选择对应模型即可在 RAG ChatBot 中体验多模态问答、文件理解等能力。

---

## ✨ 为什么要用 Gemini？

| 特性 | 描述 |
| --- | --- |
| 🧠 多模态 | 同时理解文本、图片、PDF、音频等内容 |
| ⚡ 高性能 | Flash 系列模型响应快、费用低，适合日常问答 |
| 🔒 安全可靠 | 自带内容安全过滤，适用于对输出质量有要求的场景 |
| 🔗 原生集成 | 已接入当前鉴权体系，获取 token 后即可调用所有 Gemini 端点 |

---

## ⚙️ 快速配置

1. **申请 API Key**  
   前往 [Google AI Studio](https://makersuite.google.com/app/apikey)，按照向导创建并复制密钥。

2. **写入 `.env`**（示例配置如下，可按需调整）  
   ```env
   # Gemini 相关设置
   GEMINI_API_KEY=your-gemini-api-key
   GEMINI_MODEL=gemini-2.0-flash-exp
   GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta

   # 如果希望后端默认使用 Gemini，可同时写入
   LLM_PROVIDER=gemini
   EMBEDDING_PROVIDER=gemini

   # 建议保留鉴权配置
   SYSTEM_PASSWORD=your-secure-password
   JWT_SECRET_KEY=your-jwt-secret
   ```

3. **重启服务并访问登录页**  
   ```bash
   ./start.sh
   # 浏览器打开 http://localhost:3000/login
   ```

> 📌 没有配置 `SYSTEM_PASSWORD` 也没关系，可在游客模式里手动填入 Gemini Key。

---

## 🧪 获取访问令牌

所有 Gemini 相关 API 均受鉴权保护，需要携带 `Authorization: Bearer <token>`。

```bash
# 系统模式（服务器保管密钥）
TOKEN=$(curl -s -X POST http://localhost:8001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"your-secure-password","provider":"env"}' | jq -r '.access_token')
```

```bash
# 游客模式（自行提供密钥）
TOKEN=$(curl -s -X POST http://localhost:8001/auth/guest \
  -H "Content-Type: application/json" \
  -d '{
    "llm_provider": "gemini",
    "llm_model": "gemini-2.0-flash-exp",
    "llm_api_key": "your-gemini-key",
    "embedding_provider": "gemini",
    "embedding_model": "models/embedding-001",
    "embedding_api_key": "your-gemini-key"
  }' | jq -r '.access_token')
```

测试是否成功：
```bash
curl http://localhost:8001/gemini/info -H "Authorization: Bearer $TOKEN"
```

---

## 🧩 可用模型速览

| 类型 | 推荐模型 | 说明 |
| --- | --- | --- |
| 对话 / 多模态 | `gemini-2.0-flash-exp` | 实验版，快且便宜，适合测试与日常问答 |
| 对话 / 多模态 | `gemini-1.5-flash` | 稳定版 flash，兼顾速度与准确度 |
| 对话 / 多模态 | `gemini-1.5-pro` | 高性能版本，适合复杂推理 |
| 向量化 | `models/embedding-001` | 文本嵌入，配合向量检索使用 |

> ℹ️ 模型列表也可以通过 `GET /gemini/models` 实时查询。

---

## 🚀 常见操作示例

### 1. 提问
```bash
curl -X POST http://localhost:8001/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"question":"解释一下多模态 AI 的优势"}'
```

### 2. 上传文件后提问
```bash
curl -X POST http://localhost:8001/gemini/upload-file \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@document.pdf" \
  -F "question=请总结文档要点" \
  -F "process=true"
```

### 3. 多文件处理
```bash
curl -X POST http://localhost:8001/gemini/process-with-files \
  -H "Authorization: Bearer $TOKEN" \
  -F "question=这些材料的共同主题是什么？" \
  -F "files=@file1.pdf" \
  -F "files=@file2.jpg" \
  -F "process_type=qa"
```

---

## 📁 支持的文件与处理类型

| 文件格式 | 示例 | 大小上限 |
| --- | --- | --- |
| 文档 | PDF、TXT、Markdown | 100 MB |
| 图片 | PNG、JPG、JPEG | 100 MB |
| 音频 | MP3、WAV | 100 MB |
| 视频 | MP4 | 100 MB |
| 数据 | JSON | 100 MB |

| 处理类型 | 用途 |
| --- | --- |
| `qa` | 问答（默认） |
| `summarize` | 生成摘要 |
| `extract` | 抽取结构化信息 |

---

## 🔚 清理与维护

```bash
# 查看当前配置
curl http://localhost:8001/gemini/info -H "Authorization: Bearer $TOKEN"

# 拉取最新模型列表
curl http://localhost:8001/gemini/models -H "Authorization: Bearer $TOKEN"

# 清理上传的临时文件
curl -X DELETE http://localhost:8001/gemini/cleanup -H "Authorization: Bearer $TOKEN"
```

> ✅ 建议定期清理临时文件，尤其是在共享或资源受限的环境中运行时。

---

一切准备就绪后，就可以在 RAG ChatBot 中畅享 Gemini 带来的多模态检索体验啦！🎉

