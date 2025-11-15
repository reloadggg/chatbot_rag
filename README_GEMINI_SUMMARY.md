# 🔍 Google Gemini 支持 - 简要说明

## 🎯 新增功能

### ✅ Gemini 原生支持
- **多提供商支持** - 同时支持OpenAI和Google Gemini
- **文件搜索** - 上传PDF、图片等文件进行智能问答
- **多模态处理** - 支持文本、图片、PDF等多种格式
- **高性能** - 响应速度快，支持大文件处理

### 🚀 Gemini 特色功能
1. **原生文件处理** - 无需预处理，直接上传文件
2. **多模态AI** - 同时处理文本、图片、文档
3. **成本优势** - 相比OpenAI更低的API成本
4. **中文优化** - 对中文内容理解更好

## 🔧 快速配置

### 1. 获取 Gemini API 密钥
访问 [Google AI Studio](https://makersuite.google.com/app/apikey)

### 2. 配置环境变量
在 `server/.env` 中追加：
```env
# Gemini 配置
GEMINI_API_KEY=your-gemini-api-key-here
LLM_PROVIDER=gemini
EMBEDDING_PROVIDER=gemini

# 若需启用系统登录，请同时设置
SYSTEM_PASSWORD=your-secure-password
JWT_SECRET_KEY=your-jwt-secret
```

> 提示：`SYSTEM_PASSWORD` 需不少于8位。未配置系统密码时，可使用游客模式在前端填写密钥。

### 3. 获取访问令牌
```bash
TOKEN=$(curl -s -X POST http://localhost:8001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"your-secure-password","provider":"env"}' | jq -r '.access_token')
```

若使用游客模式，可将上述请求替换为 `/auth/guest` 并传入自己的Gemini密钥。所有 `/query` 与 `/gemini/*` 接口都需要在请求头中携带 `Authorization: Bearer $TOKEN`。

> 未安装 `jq` 时，可以手动复制响应中的 `access_token` 或使用其他JSON解析工具。

### 4. 访问 Gemini 功能
- **提供商管理**: http://localhost:3000/providers
- **文件搜索**: 使用 `curl` 时添加 `-H "Authorization: Bearer $TOKEN"`

## 📋 支持的文件格式
- PDF文档（最大100MB）
- 图片（PNG、JPG、JPEG）
- 文本文件（TXT、MD）
- JSON数据文件

## 🌐 API 端点
```bash
# 上传文件到Gemini
POST /gemini/upload-file

# 多文件处理
POST /gemini/process-with-files

# 获取提供商信息
GET /gemini/info

# 获取可用模型
GET /gemini/models
```

> 以上接口均需在请求头中携带 `Authorization: Bearer $TOKEN`。

## 🎯 使用场景
1. **文档智能分析** - 上传技术文档，提取关键信息
2. **图片内容理解** - 上传图表，分析数据趋势
3. **多文档对比** - 上传多个文档，进行对比分析
4. **成本优化** - 使用Gemini替代OpenAI，降低成本

## 🚀 快速开始

```bash
# 1. 配置 Gemini
cd /path/to/RAG-ChatBot
echo "GEMINI_API_KEY=your-key" >> server/.env
echo "LLM_PROVIDER=gemini" >> server/.env

# 2. 重启服务
./start.sh

# 3. 访问 Gemini 功能
open http://localhost:3000/providers
```

---

**🎉 现在您可以体验 Google Gemini 的强大功能了！**

详细配置指南请参考 [README_GEMINI.md](README_GEMINI.md)