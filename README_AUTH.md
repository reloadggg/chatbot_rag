# 🔐 鉴权系统使用指南

## 🎯 鉴权功能概述

RAG知识库机器人现已支持完整的**鉴权系统**，提供两种登录模式：

### ✅ 支持的认证模式

1. **🔐 系统登录模式** - 使用预设的密码和API配置
2. **👤 游客登录模式** - 自定义API密钥和提供商配置

## 🔧 鉴权配置

### 1. 系统密码配置

在 `server/.env` 文件中设置系统密码和JWT密钥：

```env
# 系统安全设置
SYSTEM_PASSWORD=your-secure-password-here  # 最少8位字符
JWT_SECRET_KEY=your-jwt-secret-key-here    # 用于token签名
```

### 2. 认证模式选择

启动应用后，前端会自动调用 `/auth/status` 并根据系统配置选择默认认证模式：
- 如果设置了 `SYSTEM_PASSWORD`（不少于8位），系统登录模式可用
- 如果没有配置系统密码，则默认使用游客登录模式

## 🚀 使用方式

### 系统登录模式

适合：
- 管理员使用
- 团队共享环境
- 使用预设的API配置

**登录界面：**
- 输入系统密码
- 选择默认提供商（仅用于初始化界面，实际仍以环境变量中的密钥/模型为准）
- 登录后系统自动读取服务器环境变量中的API密钥和模型配置

### 游客登录模式

适合：
- 个人用户使用
- 自定义API配置
- 临时访问

**登录界面：**
- 自定义选择AI提供商（OpenAI/Gemini）
- 输入自己的API密钥
- 设置自定义的BaseURL（可选）
- 配置独立的LLM和嵌入模型

## 📋 登录流程

### 1. 访问系统
打开应用会自动跳转到登录页面：
```
http://localhost:3000/login
```

### 2. 选择认证模式
- **系统登录**：需要输入系统密码
- **游客登录**：需要配置自己的API密钥

### 3. 系统登录配置
如果选择系统登录：
- 输入系统密码（最少8位）
- 选择默认提供商（可选）
- 系统将使用环境变量中的API配置

### 4. 游客登录配置
如果选择游客登录：
- 选择LLM提供商（OpenAI/Gemini）
- 输入相应的API密钥
- 选择模型类型
- 设置BaseURL（可选）
- 配置嵌入模型提供商

### 5. 开始使用
登录成功后会自动跳转到主界面，所有后续操作都会携带认证信息。

## 🔍 认证状态管理

### 前端认证检查
系统会自动验证用户的登录状态：
- 未登录用户会被重定向到登录页
- 登录状态会保存在localStorage中（`access_token`、`user_type`、`user_config` 等字段）
- 所有对受保护后端API的请求都需要在 `Authorization` 请求头中携带 `Bearer <token>`

### 用户信息显示
导航栏会显示当前用户的类型：
- 🔐 系统用户 - 使用环境变量配置
- 👤 游客用户 - 使用自定义API配置

## 🛡️ 安全特性

### 1. JWT Token认证
- 使用JWT进行用户认证
- Token有效期为24小时
- 需在请求头中使用 `Authorization: Bearer <token>`

### 2. 密码安全
- 系统密码最少8位字符
- 当前实现直接比较明文密码，建议在部署环境中自行使用安全的密钥管理策略
- 建议同时配置 `JWT_SECRET_KEY`，用于签名令牌

### 3. 数据隔离
- 游客用户的API密钥不会保存在服务器
- 所有配置仅在当前会话中有效
- 系统用户和游客用户完全隔离

### 4. API访问控制
- 所有API端点都需要认证
- 基于token的权限验证
- 用户只能访问自己的配置数据

## 🎯 使用场景

### 系统登录模式适合：
- 🏢 **企业环境** - 统一API配置，团队共享
- 🔧 **开发测试** - 使用预设的稳定配置
- 👥 **多用户共享** - 管理员统一管理API密钥
- ⚙️ **生产环境** - 使用环境变量的安全配置

### 游客登录模式适合：
- 👤 **个人用户** - 使用自己的API密钥
- 🧪 **测试体验** - 快速尝试不同配置
- 💰 **成本控制** - 使用自己的账户配额
- 🔑 **密钥安全** - 不共享API密钥给他人

## 🚀 快速开始

### 1. 配置系统密码（可选）
```bash
cd /path/to/RAG-ChatBot/server
echo "SYSTEM_PASSWORD=mysecurepassword123" >> .env
echo "JWT_SECRET_KEY=myjwtsecretkey456" >> .env
```

### 2. 启动系统
```bash
./start.sh
```

### 3. 访问登录页面
```
http://localhost:3000/login
```

### 4. 选择认证模式
- 输入系统密码（如果配置了）
- 或者选择游客模式并配置API密钥

### 5. 开始使用
登录成功后即可使用所有功能！

## 🔑 API调用示例

### 1. 获取系统令牌
```bash
curl -X POST http://localhost:8001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"your-secure-password","provider":"env"}'
```

将响应中的 `access_token` 保存到变量：

```bash
TOKEN="<返回的access_token>"
curl http://localhost:8001/healthz \
  -H "Authorization: Bearer $TOKEN"
```

### 2. 游客模式获取令牌
```bash
curl -X POST http://localhost:8001/auth/guest \
  -H "Content-Type: application/json" \
  -d '{
    "llm_provider": "gemini",
    "llm_model": "gemini-2.0-flash-exp",
    "llm_api_key": "your-gemini-key",
    "llm_base_url": "https://generativelanguage.googleapis.com/v1beta",
    "embedding_provider": "gemini",
    "embedding_model": "models/embedding-001",
    "embedding_api_key": "your-gemini-key",
    "embedding_base_url": "https://generativelanguage.googleapis.com/v1beta"
  }'
```

随后同样在请求头中携带 `Authorization: Bearer <token>` 即可访问受保护接口。

## 🔧 高级配置

### 自定义JWT密钥
```env
JWT_SECRET_KEY=your-very-secure-jwt-secret-key-here
```

### 设置Token有效期
（可以通过修改后端代码调整）

### 多提供商支持
游客模式支持同时配置多个提供商，系统会自动选择合适的配置。

## 📊 用户类型对比

| 功能 | 系统用户 | 游客用户 |
|------|----------|----------|
| API密钥来源 | 环境变量 | 用户输入 |
| 配置持久性 | 服务器环境 | 会话期间 |
| 提供商选择 | 预设选项 | 完全自定义 |
| 访问权限 | 全部功能 | 全部功能 |
| 数据隔离 | 系统级 | 会话级 |

## 🔍 故障排除

### 常见问题

1. **登录失败**
   - 检查系统密码是否正确
   - 验证API密钥格式
   - 确保网络连接正常

2. **Token过期**
   - Token有效期为24小时
   - 需要重新登录

3. **权限错误**
   - 确保已登录
   - 检查token是否有效

4. **配置错误**
   - 验证API密钥格式
   - 检查BaseURL格式
   - 确认提供商选择正确

---

**🔐 现在您的RAG知识库机器人具备了完整的鉴权系统！**

用户可以选择系统模式（统一管理）或游客模式（个性化配置），确保了系统的安全性和灵活性。🎉