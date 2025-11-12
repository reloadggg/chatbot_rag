# 🔍 Google Gemini 支持指南

## 🎯 Gemini 功能概述

RAG知识库机器人现已支持 **Google Gemini** 作为AI提供商，提供以下增强功能：

### ✨ Gemini 特色功能

1. **📝 文件搜索** - 上传PDF、图片等文件，基于内容进行智能问答
2. **🎨 多模态处理** - 支持文本、图片、PDF等多种格式的智能处理  
3. **⚡ 高性能** - 支持大文件处理，响应速度快
4. **🛡️ 安全过滤** - 内置内容安全过滤，确保输出质量
5. **🔧 原生集成** - 与现有RAG系统无缝集成

## 🔧 Gemini 配置

### 1. 获取 Gemini API 密钥

访问 [Google AI Studio](https://makersuite.google.com/app/apikey) 获取您的 API 密钥：

1. 登录您的 Google 账号
2. 点击 "Create API Key"
3. 选择或创建项目
4. 复制生成的 API 密钥

### 2. 配置环境变量

在 `.env` 文件中添加 Gemini 配置：

```env
# Gemini 配置（可选）
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-2.0-flash-exp
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta

# 选择使用 Gemini 作为提供商
LLM_PROVIDER=gemini
EMBEDDING_PROVIDER=gemini
```

### 3. 支持的 Gemini 模型

| 模型 | 类型 | 描述 |
|------|------|------|
| `gemini-2.0-flash-exp` | 语言模型 | 最新实验版，速度极快 |
| `gemini-1.5-flash` | 语言模型 | 平衡性能和速度 |
| `gemini-1.5-pro` | 语言模型 | 最强性能，适合复杂任务 |
| `models/embedding-001` | 嵌入模型 | 文本向量化 |

## 🚀 使用 Gemini 功能

### 1. 基础问答（使用Gemini作为LLM提供商）

```bash
# 配置使用Gemini作为LLM提供商
LLM_PROVIDER=gemini
LLM_MODEL=gemini-2.0-flash-exp

# 正常进行问答
POST http://localhost:8001/query
{
  "question": "什么是多模态AI？"
}
```

### 2. 文件搜索功能

#### 上传文件到 Gemini 并进行问答

```bash
# 上传PDF文件并提问
curl -X POST http://localhost:8001/gemini/upload-file \
  -F "file=@document.pdf" \
  -F "question=这份文档的主要内容是什么？" \
  -F "process=true"
```

#### 多文件处理

```bash
# 上传多个文件并提问
curl -X POST http://localhost:8001/gemini/process-with-files \
  -F "question=这些文件有什么共同点？" \
  -F "files=@file1.pdf" \
  -F "files=@file2.jpg" \
  -F "process_type=qa"
```

### 3. 支持的文件格式

| 格式 | 类型 | 最大大小 |
|------|------|----------|
| PDF | 文档 | 100MB |
| TXT, MD | 文本 | 100MB |
| JSON | 数据 | 100MB |
| PNG, JPG, JPEG | 图片 | 100MB |
| MP4 | 视频 | 100MB |
| MP3, WAV | 音频 | 100MB |

### 4. 处理类型

| 类型 | 描述 |
|------|------|
| `qa` | 问答模式（默认） |
| `summarize` | 摘要模式 |
| `extract` | 提取模式 |

## 📋 Gemini API 端点

### 文件管理端点
```bash
# 上传文件到Gemini
POST /gemini/upload-file
- 支持多格式文件
- 最大100MB
- 自动MIME类型检测

# 多文件处理
POST /gemini/process-with-files
- 最多10个文件
- 支持问答、摘要、提取

# 获取Gemini信息
GET /gemini/info
- 配置状态
- 功能列表

# 获取可用模型
GET /gemini/models
- 支持的模型列表
- 当前配置模型

# 清理上传的文件
DELETE /gemini/cleanup
- 清理Gemini云端文件
```

## 🎯 使用场景

### 1. 文档智能分析
```bash
# 上传技术文档并提取关键信息
curl -X POST http://localhost:8001/gemini/upload-file \
  -F "file=@tech_doc.pdf" \
  -F "question=请总结这份技术文档的主要技术点和创新之处" \
  -F "process=true"
```

### 2. 图片内容理解
```bash
# 上传图片并询问内容
curl -X POST http://localhost:8001/gemini/upload-file \
  -F "file=@chart.png" \
  -F "question=这张图表显示了什么数据趋势？" \
  -F "process=true"
```

### 3. 多文档对比分析
```bash
# 上传多个文档进行对比
curl -X POST http://localhost:8001/gemini/process-with-files \
  -F "question=这些文档有什么异同点？" \
  -F "files=@doc1.pdf" \
  -F "files=@doc2.pdf" \
  -F "process_type=qa"
```

## 🔧 高级配置

### 自定义Gemini模型参数
```env
# 选择特定的Gemini模型
GEMINI_MODEL=gemini-1.5-pro

# 自定义基础URL（一般不需要修改）
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta

# 安全设置（可选）
GEMINI_SAFETY_SETTINGS=medium
```

### 多提供商混合使用
```env
# 使用OpenAI作为LLM，Gemini作为嵌入模型
LLM_PROVIDER=openai
EMBEDDING_PROVIDER=gemini

# 或者反过来
LLM_PROVIDER=gemini
EMBEDDING_PROVIDER=openai
```

## 🛡️ 安全与限制

### 内容安全
- 自动内容过滤和审核
- 支持自定义安全级别
- 符合Google AI原则

### 使用限制
- 免费额度：每分钟60次请求
- 文件大小：最大100MB
- API配额：根据账户等级

### 最佳实践
1. **合理配置API密钥** - 不要硬编码在代码中
2. **监控使用情况** - 关注API配额和费用
3. **内容审核** - 遵守内容安全政策
4. **错误处理** - 完善的异常处理机制

## 🚀 快速开始

### 1. 配置Gemini
```bash
# 编辑配置文件
nano server/.env

# 添加Gemini配置
GEMINI_API_KEY=your-api-key-here
LLM_PROVIDER=gemini
EMBEDDING_PROVIDER=gemini
```

### 2. 重启服务
```bash
./start.sh
```

### 3. 访问Gemini功能
- 提供商管理: http://localhost:3000/providers
- Gemini功能: http://localhost:3000/providers/gemini

## 📊 性能对比

| 功能 | OpenAI | Gemini | 说明 |
|------|--------|--------|------|
| 文本生成 | ✅ | ✅ | 两者都支持 |
| 文件处理 | ❌ | ✅ | Gemini原生支持 |
| 多模态 | ❌ | ✅ | Gemini支持图片、PDF等 |
| 中文支持 | ✅ | ✅ | 两者都支持 |
| 响应速度 | 快 | 极快 | Gemini速度优势 |
| 成本 | 中等 | 较低 | Gemini成本优势 |

## 🔍 故障排除

### 常见问题

1. **API密钥无效**
   - 确认密钥格式正确
   - 检查密钥是否已启用
   - 验证项目配额

2. **文件上传失败**
   - 检查文件格式和大小
   - 确认MIME类型正确
   - 验证网络连接

3. **处理结果不准确**
   - 调整文件质量
   - 优化问题描述
   - 选择合适的处理类型

### 获取帮助
- [Google AI Studio文档](https://ai.google.dev/docs)
- [Gemini API参考](https://ai.google.dev/api)
- [GitHub Issues](https://github.com/reloadggg/chatbot_rag/issues)

---

**🎉 现在您可以体验Google Gemini的强大功能了！**

Gemini为您的RAG知识库机器人带来了原生文件处理、多模态AI和更强大的文档理解能力。🚀