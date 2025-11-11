# 🌐 WSL环境访问指南

## 🎯 Windows访问WSL服务说明

在WSL环境中运行的服务可以通过特定的IP地址从Windows主机访问。以下是详细的访问指南：

## 📍 当前WSL IP地址

**WSL IP地址**: `172.27.78.67`

## 🔗 访问地址

### 后端API服务
- **健康检查**: http://172.27.78.67:8001/healthz
- **API文档**: http://172.27.78.67:8001/docs
- **查询API**: http://172.27.78.67:8001/query
- **流式API**: http://172.27.78.67:8001/stream

### 前端Web界面
- **主页面**: http://172.27.78.67:3000
- **聊天界面**: http://172.27.78.67:3000/chat

## 🚀 快速验证

### 1. 验证后端服务
在Windows浏览器或PowerShell中访问：
```
http://172.27.78.67:8001/healthz
```

应该返回：
```json
{
  "status": "ok",
  "env": "dev",
  "embedding_model": "text-embedding-3-small",
  "llm_model": "gpt-4o-mini",
  "message": "系统运行正常"
}
```

### 2. 验证前端界面
在Windows浏览器中访问：
```
http://172.27.78.67:3000/chat
```

应该看到RAG知识库机器人的聊天界面。

## 🔧 服务状态检查

### 检查后端服务
```bash
# 在WSL中执行
curl http://172.27.78.67:8001/healthz
```

### 检查前端服务
```bash
# 在WSL中执行
curl -I http://172.27.78.67:3000
```

### 查看运行进程
```bash
# 在WSL中执行
ps aux | grep -E "uvicorn|next" | grep -v grep
```

## 🔄 服务重启指南

如果服务未运行，可以按以下步骤重启：

### 重启后端服务
```bash
cd /mnt/d/codex/rag-chatbot/server
source .venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### 重启前端服务
```bash
cd /mnt/d/codex/rag-chatbot/web
pnpm dev --hostname 0.0.0.0 --port 3000
```

## 🌐 网络配置说明

### WSL网络模式
WSL使用虚拟网络适配器，IP地址通常格式为：`172.x.x.x`

### 查看WSL IP地址
```bash
# 在WSL中执行
ip addr show eth0 | grep inet
```

### Windows主机访问
Windows主机可以通过WSL的IP地址访问WSL中的服务，无需额外配置。

## ⚠️ 注意事项

1. **防火墙设置**: 确保Windows防火墙允许访问相应端口
2. **服务绑定**: 服务必须绑定到 `0.0.0.0` 而不仅仅是 `localhost`
3. **IP地址变化**: WSL IP地址可能会在重启后变化，需要重新检查
4. **服务依赖**: 确保后端服务已启动再访问前端

## 🔍 故障排除

### 无法访问服务
1. 检查服务是否在WSL中正常运行
2. 确认IP地址是否正确
3. 检查服务是否绑定到 `0.0.0.0`
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

---

**现在您可以从Windows主机访问WSL中的RAG知识库机器人系统了！🎉**