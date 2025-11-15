# 🔐 鉴权系统使用指南

> TL;DR：系统首次启动会要求登录。你可以使用服务器预置的密码（系统模式），也可以带着自己的 API Key 以游客身份进入。

---

## 🌟 功能一览

| 登录方式 | 适用场景 | 核心特点 |
| --- | --- | --- |
| **系统登录** | 团队共用、稳定部署 | 使用服务器 `.env` 中的密钥与模型，无需手动填写 API Key |
| **游客登录** | 个人试用、临时接入 | 登录时自带 API Key、模型与 Base URL，不写入服务器 |

---

## ⚙️ 准备工作

1. **编辑服务器配置**（可选但推荐）  
   在 `server/.env` 中加入：
   ```env
   SYSTEM_PASSWORD=your-secure-password   # 至少 8 位
   JWT_SECRET_KEY=your-jwt-secret         # JWT 签名密钥
   ```
2. **重启后端服务**  
   ```bash
   ./start.sh
   ```
3. **访问登录页**  
   浏览器打开 `http://localhost:3000/login`

> 💡 如果不设置 `SYSTEM_PASSWORD`，系统会自动进入游客模式引导，你需要在页面里手动填写 API Key。

---

## 🔑 登录体验

### 🅰️ 系统登录

- 输入 8 位以上的系统密码即可进入
- 前端默认提供商仅用于界面展示，真实配置仍来自服务器环境变量
- 登录成功后，后端会下发 24 小时有效的访问令牌

### 🅱️ 游客登录

- 适用于带着自己的 OpenAI / Gemini / 其他模型配置访问
- 页面中可以分别设置：
  - LLM 提供商、模型、Base URL
  - 嵌入模型及其密钥
- 所有密钥只保存在当前浏览器会话里，不会上传到服务器磁盘

---

## 🔍 登录之后会发生什么？

- 前端会把 `access_token`、`user_type` 等信息写入 `localStorage`
- 每次调用受保护接口时，都会自动在请求头中附带 `Authorization: Bearer <token>`
- 未登录或令牌过期时，页面会自动跳转回 `/login`
- 顶部导航会显示当前登录身份（系统用户 / 游客）

---

## 🧪 手动获取访问令牌

在命令行想要直接调用后端？可以通过 API 获取 token：

```bash
# 系统密码登录
token=$(curl -s -X POST http://localhost:8001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"your-secure-password","provider":"env"}')
```

```bash
# 游客登录（示例以 Gemini 为例）
token=$(curl -s -X POST http://localhost:8001/auth/guest \
  -H "Content-Type: application/json" \
  -d '{
    "llm_provider": "gemini",
    "llm_model": "gemini-2.0-flash-exp",
    "llm_api_key": "your-gemini-key",
    "embedding_provider": "gemini",
    "embedding_model": "models/embedding-001"
  }')
```

取出 `access_token` 后即可访问任何受保护接口：

```bash
TOKEN=$(echo "$token" | jq -r '.access_token')
curl http://localhost:8001/healthz -H "Authorization: Bearer $TOKEN"
```

> 🔐 建议安装 `jq` 以便解析 JSON；如果环境没有，也可以改用 `python -c '…'`。

---

## 🛡️ 安全小贴士

- 系统密码建议存放在安全的密钥管理服务中，并限制访问权限
- 定期轮换 `SYSTEM_PASSWORD` 和 `JWT_SECRET_KEY`
- 游客模式密钥不会落盘，但浏览器缓存仍可能被他人读取，离开时记得退出登录
- 若部署在公网，务必同时启用 HTTPS 与反向代理的 WAF/速率限制

---

## ✅ 快速检查清单

- [ ] `.env` 中已配置系统密码与 JWT 密钥
- [ ] 前端能在登录状态下访问受保护接口（例如 `/healthz`）
- [ ] 令牌过期时能正确跳转回登录页
- [ ] 游客模式下的个人密钥不会在服务器留下痕迹

搞定！现在你已经完成 RAG ChatBot 鉴权系统的配置与使用。 🎉

