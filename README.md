# Chatbot RAG

一个采用 FastAPI + LangChain 后端与 Next.js 前端的检索增强生成（RAG）聊天与知识库管理项目。仓库包含后端 API、Web 聊天界面、文档管理页以及可选的 Gemini 多模态扩展，目标是提供可自部署的中文知识库问答体验。

## 功能概览

- **RAG 对话服务**：内置文档向量化、相似度检索、LangChain 推理链，支持 SSE 流式回答。
- **知识库管理**：上传、列表、统计、删除接口与前端页面，所有操作都需要携带认证令牌。
- **多提供商配置**：支持系统用户使用环境变量配置，也允许游客用户提交自定义的 OpenAI / Gemini API Key。
- **苹果风格 Web UI**：聊天页采用类 iMessage 的玻璃拟态布局、自动伸缩输入框与快捷提示卡片。
- **可选 Gemini 能力**：若提供 Google API Key 并安装 `google-generativeai`，可调用 Gemini 文件处理与多模态接口。

## 目录结构

```
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
├── start.sh               # 可选的本地一键启动脚本（WSL 辅助）
└── start_simple.sh
```

## 环境要求

- Python 3.10+
- Node.js 18+ 与 [pnpm](https://pnpm.io)
- OpenAI、OpenRouter 或兼容的 LLM / 向量服务 API Key（最少需要一个 LLM 与一个嵌入模型）
- （可选）Google Gemini API Key 与 `google-generativeai` 依赖，用于启用多模态路由

## 配置

### 后端（`server/.env`）

后端使用 Pydantic Settings 读取 `server/.env`。请创建该文件并补齐至少以下字段：

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

如需连接 Qdrant Cloud，请同时设置 `QDRANT_URL` 与 `QDRANT_API_KEY`。

### 前端（`web/.env.local`）

创建 `web/.env.local` 指定后端地址：

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Docker Compose 构建时会自动覆盖为 `/api`，无需手动修改。

## 本地运行

1. **后端**
   ```bash
   cd server
   python -m venv .venv
   source .venv/bin/activate          # Windows 使用 .venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8000
   ```
   启动后访问 http://localhost:8000/docs 查看自动生成的 OpenAPI 文档。

2. **前端**
   ```bash
   cd web
   pnpm install
   pnpm dev --port 3000
   ```
   浏览器打开 http://localhost:3000/chat 进入聊天界面。

可执行 `./start.sh` 在 WSL 环境下一键启动，脚本会尝试使用 pnpm 与 uvicorn 并写入日志文件。

## 测试

- 后端单元测试：
  ```bash
  cd server
  pytest
  ```
- 前端静态检查：
  ```bash
  cd web
  pnpm lint
  ```

`server/test_api.py` 提供了简易的端到端校验脚本，可在服务启动后运行。

## 核心 API

| 路径 | 方法 | 说明 |
| ---- | ---- | ---- |
| `/auth/login` | POST | 系统用户登录（使用环境配置） |
| `/auth/guest` | POST | 游客凭用户提供的 API Key 登录 |
| `/auth/config` | GET | 获取当前令牌对应的模型配置与可用提供商 |
| `/providers` | GET | 列出可用模型与嵌入提供商 |
| `/query` | POST | 非流式 RAG 问答 |
| `/stream` | GET | SSE 流式回答（需 `question` 查询参数） |
| `/upload` | POST | 上传文档并写入向量库 |
| `/documents` | GET | 列出已上传文档（受保护） |
| `/documents/{file_id}` | DELETE | 删除文档并清理向量条目 |
| `/documents/stats` | GET | 文档数量、字数与分块统计 |
| `/gemini/*` | 多种 | 在配置 Gemini API Key 且安装依赖后启用的文件与模型接口 |

所有受保护路由需携带 `Authorization: Bearer <token>`，前端会在登录后自动注入。

## Docker 部署

项目提供基础的 `docker-compose.yml`，会启动 FastAPI、Next.js 与一个 Nginx 反向代理：

```bash
# 若已准备好示例文件，可复制为实际配置；否则请手动创建对应文件
cp server/.env.example server/.env         # 如果存在模板
cp web/.env.local.example web/.env.local   # 如果存在模板

docker compose up --build
```

部署完成后访问 http://localhost:3000，前端通过 `/api` 代理访问后端。`server/data` 与 `server/uploads` 会挂载到宿主机以便持久化。

## 贡献

欢迎通过 Issue 或 Pull Request 反馈问题与改进建议。在提交前请确保通过 `pytest` 与 `pnpm lint`，并遵循现有的代码风格。

## 许可证

本仓库尚未添加开源许可证；在明确授权条款前，请勿在生产环境中使用或分发。
