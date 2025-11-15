# 🤖 RAG ChatBot 快速上手

> TL;DR：这是一个结合 FastAPI + LangChain 后端与 Next.js 前端的中文检索增强生成（RAG）聊天系统，内建鉴权、知识库管理与 Gemini 扩展，支持本地或 Docker 一键部署。

---

## ✨ 你能获得什么？

| 模块 | 能力亮点 |
| --- | --- |
| 💬 **RAG 对话** | 文档向量化、相似度检索、SSE 流式回答，适合知识库问答与长文本总结 |
| 📚 **知识库管理** | 网页端上传 / 删除文档、统计字数与分块，所有操作均需鉴权 |
| 🔐 **双模式登录** | 系统密码模式复用服务端配置，游客模式允许携带自有 API Key |
| 🌐 **多提供商支持** | 可切换 OpenAI、Gemini 或自建兼容 API，前后端均支持自定义 Base URL |
| 🖼️ **可选 Gemini 多模态** | 启用后可调用文件处理、图像/音频问答等原生 Gemini 路由 |
| 🪟 **现代化界面** | iMessage 风格聊天、响应式输入框、快捷提示卡片与文档管理页面 |

更多鉴权细节请查看 [`README_AUTH.md`](README_AUTH.md)，Gemini 使用指南见 [`README_GEMINI.md`](README_GEMINI.md)。

---

## 🧭 项目结构速览

```text
.
├── server/                # FastAPI 应用与 LangChain RAG 管线
│   ├── app/
│   │   ├── auth.py        # JWT 登录、游客令牌与配置分发
│   │   ├── document_processor.py
│   │   ├── gemini_routes.py
│   │   ├── main.py        # HTTP 路由：auth、query、stream、documents 等
│   │   ├── rag.py         # LangChain 组件组装与查询封装
│   │   ├── settings.py    # Pydantic 环境配置
│   │   ├── tests/         # pytest 用例
│   │   └── user_config.py
│   ├── requirements.txt
│   └── test_api.py        # 可选的端到端脚本
├── web/                   # Next.js 14 + Tailwind 前端
│   ├── app/chat/page.tsx  # ChatGPT 风格会话界面
│   ├── app/docs/page.tsx  # 知识库文档管理界面
│   ├── app/login/page.tsx # 系统/游客登录
│   ├── app/globals.css    # 全局样式（含玻璃拟态布局）
│   └── ...
├── deploy/nginx/          # Docker Compose 使用的 Nginx 配置
├── docker-compose.yml
├── start.sh               # WSL / Linux 下的组合启动脚本
└── start_simple.sh        # 精简版启动脚本
```

---

## ⚙️ 环境要求

- Python 3.10+
- Node.js 18+ 与 [pnpm](https://pnpm.io)
- 至少一个 LLM 与一个嵌入模型的 API Key（OpenAI、OpenRouter 或其他兼容服务）
- （可选）Google Gemini API Key 与 `google-generativeai` 依赖，用于启用多模态接口

---

## 🗂️ 配置清单

### 1. 后端：`server/.env`

```env
SYSTEM_PASSWORD=change-me           # /auth/login 登录密码（至少 8 位）
JWT_SECRET_KEY=some-long-secret     # JWT 签名密钥

LLM_PROVIDER=openai                 # openai | gemini | 自建兼容 API
LLM_MODEL=gpt-4o-mini
LLM_API_KEY=sk-...
LLM_BASE_URL=https://api.openai.com/v1  # 可留空

EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_API_KEY=sk-...
EMBEDDING_BASE_URL=https://api.openai.com/v1  # 可留空

# 可选 Gemini 支持
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash-exp

# 其他常用参数
VECTOR_DB=chroma                    # chroma | qdrant
VECTOR_DB_PATH=./data/chroma
ALLOW_ORIGINS=http://localhost:3000
```

> ☁️ 连接 Qdrant Cloud 时，请额外设置 `QDRANT_URL` 与 `QDRANT_API_KEY`。

### 2. 前端：`web/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Docker Compose 运行时会自动重写为 `/api`，无需手动修改。

---

## 🚀 启动流程

1. **启动后端**
   ```bash
   cd server
   python -m venv .venv
   source .venv/bin/activate          # Windows 使用 .venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8000
   ```
   打开 http://localhost:8000/docs 查看自动生成的 OpenAPI 文档。

2. **启动前端**
   ```bash
   cd web
   pnpm install
   pnpm dev --port 3000
   ```
   浏览器访问 http://localhost:3000/chat 即可体验聊天页面。

> 🛟 想要更省心？在 WSL 环境下执行 `./start.sh` 会同时拉起前后端并输出日志。

---

## 🔐 核心 API & 鉴权

| 路径 | 方法 | 说明 |
| ---- | ---- | ---- |
| `/auth/login` | POST | 系统用户登录（使用服务器 `.env` 配置） |
| `/auth/guest` | POST | 游客登录（自带 API Key 与模型配置） |
| `/auth/config` | GET | 返回当前令牌对应的模型配置 |
| `/providers` | GET | 列出可用 LLM 与嵌入模型提供商 |
| `/query` | POST | 非流式 RAG 问答 |
| `/stream` | GET | SSE 流式回答（需 `question` 查询参数） |
| `/upload` | POST | 上传文档并写入向量库 |
| `/documents` | GET | 列出已上传文档（受保护） |
| `/documents/{file_id}` | DELETE | 删除指定文档 |
| `/documents/stats` | GET | 文档统计信息 |
| `/gemini/*` | 多种 | 启用 Gemini 后的文件处理与模型接口 |

所有受保护接口都需要在请求头中携带 `Authorization: Bearer <token>`。获取令牌的完整流程请参考 [`README_AUTH.md`](README_AUTH.md)。

---

## 🧪 验证与测试

- **后端单元测试**
  ```bash
  cd server
  pytest
  ```
- **前端静态检查**
  ```bash
  cd web
  pnpm lint
  ```
- **端到端验证（可选）**：在服务启动后执行 `python server/test_api.py`。

---

## 🐳 Docker 部署

```bash
# 如果提供了示例配置，可先复制
cp server/.env.example server/.env         # 若不存在请手动创建
cp web/.env.local.example web/.env.local   # 若不存在请手动创建

docker compose up --build
```

完成后访问 http://localhost:3000，前端会通过 `/api` 代理请求后端；`server/data` 与 `server/uploads` 会挂载到宿主机以便持久化。

---

## 🤝 贡献指南

欢迎提交 Issue 或 Pull Request，一起完善中文 RAG 体验。提交前请确保：

- 代码通过 `pytest` 与 `pnpm lint`
- 相关文档已同步更新（例如鉴权、Gemini 或部署指南）
- Commit 信息语义清晰，遵循 Conventional Commits 风格

---

## 📄 许可证

本仓库尚未添加开源许可证；在明确授权条款前，请勿在生产环境中使用或分发。

祝你玩得开心，期待你的反馈！🎉
