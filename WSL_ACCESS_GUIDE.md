# 🌐 Windows 访问 WSL 服务指南

> TL;DR：确保服务监听 `0.0.0.0`，然后直接在 Windows 浏览器里访问 `http://localhost:<端口>`；若失败，再退而求其次用 WSL IP。

---

## 🧭 整体流程

1. **在 WSL 中启动 RAG ChatBot**（`./start.sh` 或手动开启前后端）
2. **确认服务端口**：后端 `8001`、前端 `3000`
3. **在 Windows 侧打开** `http://localhost:3000` 并完成登录
4. **需要调用后端接口？** 记得先通过鉴权接口拿到 `access_token`

---

## 🔌 常见访问方式

| 方案 | 适用情况 | 访问地址 |
| --- | --- | --- |
| ✅ Localhost（推荐） | WSL2 默认、服务监听 `0.0.0.0` | `http://localhost:<端口>` |
| 🛠️ WSL IP | Localhost 异常或需要显式 IP | `http://<WSL_IP>:<端口>` |

### 如何获取 WSL IP？
```bash
ip addr show eth0 | grep -oP '(?<=inet\s)\d+(\.\d+){3}'
```

> 💡 每次重启 WSL IP 都可能变化，建议首选 localhost。

---

## 🔐 访问前先拿到 Token

所有受保护接口都需要 `Authorization: Bearer <token>`。在 WSL 中执行：

```bash
TOKEN=$(curl -s -X POST http://localhost:8001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"your-secure-password","provider":"env"}' | jq -r '.access_token')
echo "$TOKEN"
```

- 如果未设置系统密码，可在前端游客模式中登录，然后在浏览器 `localStorage` 查看 `access_token`
- 没有 `jq`？使用 `python -c 'import sys,json; print(json.load(sys.stdin)["access_token"])'`

---

## 🧪 验证步骤

1. **后端健康检查（Windows PowerShell）**
   ```powershell
   $token = "<TOKEN>"
   curl http://localhost:8001/healthz -Headers @{ Authorization = "Bearer $token" }
   ```

2. **前端访问**  
   浏览器打开 `http://localhost:3000/chat`，首次会跳到登录页

3. **命令行快速自检（WSL 内）**
   ```bash
   curl http://localhost:8001/healthz -H "Authorization: Bearer $TOKEN"
   curl -I http://localhost:3000
   ps aux | grep -E "uvicorn|next" | grep -v grep
   ```

---

## 🛠️ 启动方式速查

### 一键启动
```bash
cd /path/to/RAG-ChatBot
./start.sh
```

### 手动启动
```bash
# 后端
cd server && source .venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload

# 前端（新终端）
cd web && pnpm dev --hostname 0.0.0.0 --port 3000
```

> ✅ 关键点是 `--host 0.0.0.0` / `--hostname 0.0.0.0`，否则 Windows 无法访问。

---

## 🧯 故障排查清单

| 症状 | 排查要点 |
| --- | --- |
| Localhost 访问不到 | 服务是否在运行？端口是否监听 `0.0.0.0`？尝试使用 WSL IP。 |
| 连接超时 | 检查 Windows 防火墙、VPN、代理；确认端口未被占用。 |
| 鉴权失败 | 系统密码是否正确？token 是否过期？请求头格式是否正确？ |
| 页面白屏 | 打开浏览器控制台查看报错，确认前端构建成功。 |

---

## ✅ 最终检查

- [ ] `./start.sh` 或等效命令已在 WSL 中运行
- [ ] `http://localhost:3000/login` 能在 Windows 浏览器打开
- [ ] 后端接口可通过 `Authorization: Bearer <token>` 成功访问
- [ ] 遇到异常时已尝试使用 WSL IP 并排除防火墙问题

全部打勾就可以顺利地在 Windows 侧访问 WSL 中的 RAG ChatBot 啦！🎉


