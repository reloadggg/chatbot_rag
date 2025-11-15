# 🌐 WSL环境访问指南

## 🎯 Windows访问WSL服务说明

在WSL环境中运行的服务可以通过特定的IP地址从Windows主机访问。以下是详细的访问指南：

## 📍 访问方式

### 方式1: Localhost访问（推荐）
**适用场景**: 服务绑定到 `0.0.0.0`，WSL2环境
**访问地址**: `localhost`

### 方式2: WSL IP地址访问
**适用场景**: 需要明确IP地址，或WSL1环境
**获取IP**: 运行 `ip addr show eth0 | grep inet` 查看实际IP

## 🔗 访问地址

### 后端API服务
- **健康检查**: http://localhost:8001/healthz （需要 `Authorization: Bearer <token>`）
- **API文档**: http://localhost:8001/docs
- **查询API**: http://localhost:8001/query
- **流式API**: http://localhost:8001/stream

### 前端Web界面
- **主页面**: http://localhost:3000
- **登录页面**: http://localhost:3000/login
- **聊天界面**: http://localhost:3000/chat

## 🚀 快速验证

### 1. 获取访问令牌
所有受保护的API都需要携带 `Authorization: Bearer <token>`。可以先在WSL中执行：

```bash
TOKEN=$(curl -s -X POST http://localhost:8001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"your-secure-password","provider":"env"}' | jq -r '.access_token')
echo "$TOKEN"
```

将输出的令牌复制到Windows环境。若未配置系统密码，可通过前端游客模式登录并在浏览器开发者工具的 Local Storage 中查看 `access_token`。

> 如果环境未安装 `jq`，可以手动复制响应中的 `access_token` 字段值。

### 2. 验证后端服务
在Windows的PowerShell中执行（将 `<TOKEN>` 替换为上一步复制的令牌）：
```powershell
$token = "<TOKEN>"
curl http://localhost:8001/healthz -Headers @{ Authorization = "Bearer $token" }
```

预期返回：
```json
{
  "status": "ok",
  "env": "dev",
  "embedding_model": "text-embedding-3-small",
  "llm_model": "gpt-4o-mini",
  "message": "系统运行正常",
  "user_type": "system",
  "providers": {
    "llm": "openai",
    "embedding": "openai",
    "gemini_available": true
  }
}
```

### 3. 验证前端界面
在Windows浏览器中访问：
```
http://localhost:3000/chat
```

首次访问会跳转到登录页面，登录成功后即可看到聊天界面。

## 🔧 服务状态检查

### 检查后端服务
```bash
# 在WSL中执行
curl http://localhost:8001/healthz -H "Authorization: Bearer <TOKEN>"
```

### 检查前端服务
```bash
# 在WSL中执行
curl -I http://localhost:3000
```

### 查看运行进程
```bash
# 在WSL中执行
ps aux | grep -E "uvicorn|next" | grep -v grep
```

## 🔗 WSL IP备用方案

如果localhost无法访问，可以使用WSL的实际IP：

```bash
# 获取WSL IP地址
WSL_IP=$(ip addr show eth0 | grep -oP '(?<=inet\s)\d+(\.\d+){3}')
echo "WSL IP: $WSL_IP"

# 使用WSL IP访问
# 后端: http://$WSL_IP:8001/healthz
# 前端: http://$WSL_IP:3000/chat
```

## 🚀 启动命令

### 方式1: 一键启动（推荐）
```bash
cd /path/to/RAG-ChatBot
./start.sh
```

### 方式2: 手动启动
```bash
# 启动后端
# 启动后端
cd server && source .venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload

# 启动前端（新终端）
cd web && pnpm dev --hostname 0.0.0.0 --port 3000
```

## ⚠️ 注意事项

1. **服务绑定**: 确保服务绑定到 `0.0.0.0` 而不仅仅是 `localhost`
2. **防火墙设置**: Windows防火墙需要允许访问相应端口
3. **WSL版本**: WSL2推荐使用localhost，WSL1可能需要具体IP
4. **端口占用**: 确保8001和3000端口未被其他服务占用

## 🔍 故障排除

### localhost无法访问
1. 检查服务是否在WSL中正常运行
2. 确认服务绑定到 `0.0.0.0`
3. 尝试使用WSL的实际IP地址
4. 检查Windows防火墙设置

### 连接超时
1. 检查WSL网络连接
2. 确认服务端口是否正确
3. 查看服务日志是否有错误

### 服务启动失败
1. 检查依赖是否安装完整
2. 查看端口是否被占用
3. 检查环境变量配置

## 📞 支持

如果仍然无法访问，请检查：
1. WSL版本和配置
2. Windows网络设置
3. 服务运行日志
4. 尝试使用WSL IP作为备用方案

---

**现在您可以从Windows主机使用localhost访问WSL中的RAG知识库机器人系统了！🎉**

推荐使用localhost访问，如果遇到问题再考虑使用WSL IP地址。