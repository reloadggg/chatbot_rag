#!/bin/bash

# 简化的RAG知识库机器人启动脚本

echo "🚀 启动RAG知识库机器人系统..."

# 获取WSL IP地址
WSL_IP=$(ip addr show eth0 | grep -oP '(?<=inet\s)\d+(\.\d+){3}')
echo "📍 WSL IP地址: $WSL_IP"

# 启动后端
echo "🔧 启动后端服务..."
cd server
source .venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload &
SERVER_PID=$!
echo "✅ 后端已启动 (PID: $SERVER_PID)"

# 等待后端启动
sleep 3

# 启动前端
echo "🎨 启动前端服务..."
cd ../web
pnpm dev --hostname 0.0.0.0 --port 3000 &
WEB_PID=$!
echo "✅ 前端已启动 (PID: $WEB_PID)"

echo ""
echo "🎉 系统启动完成！"
echo "💬 聊天界面: http://$WSL_IP:3000/chat"
echo "📚 API文档: http://$WSL_IP:8001/docs"
echo ""
echo "🛑 停止服务: kill $SERVER_PID $WEB_PID"