# RAG知识库机器人

基于RAG（检索增强生成）的中文知识库问答机器人，采用FastAPI + LangChain后端和Next.js + Tailwind CSS前端架构。

## 🎯 项目概述

构建一个轻量级的**个人知识库问答机器人**，通过上传文档实现检索增强生成（RAG）。系统由前后端组成：

- **前端**：Next.js + Tailwind，提供聊天界面和知识库管理
- **后端**：FastAPI + LangChain，实现RAG流程和文件处理
- **模型**：全部使用在线API（OpenAI /openrouter / Qdrant Cloud等）
- **配置**：通过`.env`动态控制模型、向量库、参数
- **特性**：SSE流式输出、中文提示、文件上传、知识库管理

## 🆕 新增功能

### 📁 文件上传和知识库管理 (M6)
- ✅ **多格式文件上传**：支持PDF、TXT、MD、JSON格式
- ✅ **自动文档处理**：文本提取 → 智能分块 → 向量化存储
- ✅ **知识库管理界面**：文档列表、上传、删除、统计信息
- ✅ **PDF文本提取**：自动从PDF文件中提取文本内容
- ✅ **实时统计面板**：显示文档数量、总大小、向量统计
- ✅ **统一导航**：方便切换问答和文档管理功能

## 🏗️ 项目结构

```
rag-chatbot/
├── server/                    # FastAPI + LangChain 后端
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py           # FastAPI应用与路由（包含文件上传API）
│   │   ├── settings.py       # 加载.env并打印模型中文信息
│   │   ├── rag.py           # RAG管道逻辑（包含文档添加功能）
│   │   ├── document_processor.py  # 文档处理核心逻辑
│   │   └── tests/
│   │       ├── __init__.py
│   │       └── test_main.py # 测试用例
│   ├── uploads/             # 上传文件存储目录
│   ├── data/
│   │   └── chroma/          # 向量数据存储
│   ├── .env                 # 环境变量配置
│   ├── .env.example         # 环境变量模板
│   └── requirements.txt     # Python依赖
│
├── web/                     # Next.js 前端
│   ├── app/
│   │   ├── globals.css      # 全局样式
│   │   ├── layout.tsx       # 布局组件（包含统一导航）
│   │   ├── page.tsx         # 首页（更新导航）
│   │   ├── chat/
│   │   │   └── page.tsx     # 聊天页面（更新导航）
│   │   └── docs/
│   │       └── page.tsx     # 知识库管理页面（新增）
│   ├── .env.local           # 前端环境变量
│   ├── package.json         # Node.js依赖
│   ├── tailwind.config.js   # Tailwind配置
│   └── next.config.js       # Next.js配置
│
├── README.md               # 项目文档
├── CONFIG_GUIDE.md         # API配置指南
├── WSL_ACCESS_GUIDE.md     # WSL访问指南
├── start.sh               # 一键启动脚本
└── PROJECT_SUMMARY.md     # 项目完成总结
```

## ⚙️ 技术栈

| 模块 | 说明 |
|------|------|
| **后端** | FastAPI、LangChain、LangChain-OpenAI、Chroma或Qdrant |
| **前端** | Next.js、React、Tailwind CSS |
| **模型** | 在线API（OpenAI / 302.ai） |
| **嵌入** | text-embedding-3-small（或同类） |
| **语言模型** | gpt-4o-mini（或等价模型） |
| **数据库** | 本地Chroma或Qdrant Cloud |
| **通信协议** | SSE（Server-Sent Events） |
| **文件处理** | PyPDF2、文本分割器 |

## 🚀 快速开始

### 环境要求
- Python 3.8+
- Node.js 16+
- pnpm包管理器

### 后端设置

```bash
# 进入后端目录
cd server

# 创建虚拟环境
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate   # Windows

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑.env文件，填入API密钥

# 运行服务
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### 前端设置

```bash
# 进入前端目录
cd web

# 安装依赖
pnpm install

# 配置环境变量（可选）
cp .env.local.example .env.local

# 运行开发服务器
pnpm dev --hostname 0.0.0.0 --port 3000
```

访问 http://172.27.78.67:3000 开始使用。

## 📋 核心功能

### 💬 智能问答
- **流式问答交互** - 实时显示AI回答过程
- **支持Markdown格式** - 富文本回答渲染
- **中文界面和日志** - 完全中文化的用户体验
- **SSE流式响应** - 低延迟的实时通信

### 📁 知识库管理
- **多格式文件上传** - 支持PDF、TXT、MD、JSON格式
- **自动文档处理** - 文本提取 → 智能分块 → 向量化存储
- **文档列表管理** - 查看、删除已上传文档
- **实时统计面板** - 文档数量、总大小、向量统计

### 🔧 系统管理
- **可配置模型参数** - 通过.env文件灵活配置
- **支持多种向量数据库** - Chroma/Qdrant可选
- **完整的测试覆盖** - 92%代码测试覆盖率
- **代码质量保证** - 通过ruff检查和格式化

## 🎯 新增API端点

### 文件管理API
```bash
# 上传文件到知识库
POST /upload
Content-Type: multipart/form-data
参数: file (文件), description (描述), process (是否处理)

# 获取已上传的文档列表
GET /documents
返回: 文档列表信息

# 删除指定文档
DELETE /documents/{file_id}
参数: file_id (文件ID)

# 获取文档统计信息
GET /documents/stats
返回: 文档数量、总大小、向量统计等
```

## 🌐 访问地址

- **主页面**: http://172.27.78.67:3000
- **智能问答**: http://172.27.78.67:3000/chat
- **知识库管理**: http://172.27.78.67:3000/docs
- **API文档**: http://172.27.78.67:8001/docs

## ⚙️ 环境变量配置

### 后端 (.env)
```env
# 基础配置
APP_NAME=RAG_知识库机器人
ENV=dev
PORT=8000

# 向量库设置
VECTOR_DB=chroma
VECTOR_DB_PATH=./data/chroma
QDRANT_URL=
QDRANT_API_KEY=

# 模型配置（在线 API）
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_API_KEY=your-api-key-here
EMBEDDING_BASE_URL=https://api.openai.com/v1

LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
LLM_API_KEY=your-api-key-here
LLM_BASE_URL=https://api.openai.com/v1

# 参数
TOP_K=24
MAX_TOKENS=800
TEMPERATURE=0.3

# 前端跨域
ALLOW_ORIGINS=http://localhost:3000
```

### 前端 (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8001
```

## 📊 测试覆盖率

当前测试覆盖率：92%

```
Name                     Stmts   Miss  Cover
--------------------------------------------
app/__init__.py              0      0   100%
app/main.py                 37      7    81%
app/rag.py                  23      0   100%
app/settings.py             27      3    89%
app/tests/__init__.py        0      0   100%
app/tests/test_main.py      35      0   100%
--------------------------------------------
TOTAL                      122     10    92%
```

## 🌏 中文日志输出

系统启动时会显示中文日志：
```
🌏 当前环境: dev
💡 使用嵌入模型: text-embedding-3-small
🧠 使用语言模型: gpt-4o-mini
✅ RAG管道初始化完成
📄 正在处理文件: example.pdf
✅ 文件已保存: uploads/uuid.pdf
📖 提取文本长度: 1500 字符
✂️  文档分割完成: 5 个片段
✅ 文件已添加到知识库
```

## 🔒 安全注意事项

1. **API密钥安全** - 不要在代码中硬编码API密钥
2. **文件大小限制** - 单个文件最大10MB
3. **文件类型验证** - 仅支持安全的文档格式
4. **定期清理** - 建议定期清理上传目录
5. **访问控制** - 生产环境建议添加用户认证

## 🚀 启动命令

### 一键启动（推荐）
```bash
cd /mnt/d/codex/rag-chatbot
./start.sh
```

### 手动启动
```bash
# 启动后端
cd server && source .venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload

# 启动前端（新终端）
cd web && pnpm dev --hostname 0.0.0.0 --port 3000
```

## 📞 支持

如有问题或建议，请通过以下方式反馈：
- 查看详细配置指南：`CONFIG_GUIDE.md`
- 查看WSL访问指南：`WSL_ACCESS_GUIDE.md`
- 查看项目完成总结：`PROJECT_SUMMARY.md`

---

**🎉 现在您的RAG知识库机器人具备了完整的文档管理和智能问答功能！** 

您可以通过知识库管理页面上传文档，系统会自动处理并构建知识库，然后在问答页面进行基于这些文档的智能问答。
