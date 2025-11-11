#!/bin/bash

# RAG知识库机器人启动脚本
# 使用方法: ./start.sh

set -e

echo "🚀 正在启动RAG知识库机器人系统..."

# 获取当前脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 获取WSL IP地址
WSL_IP=$(ip addr show eth0 | grep -oP '(?<=inet\s)\d+(\.\d+){3}')
echo "📍 WSL IP地址: $WSL_IP"

# 检查端口是否被占用
check_port() {
    if ss -tln | grep -q ":$1 "; then
        echo "⚠️  端口 $1 已被占用"
        return 1
    fi
    return 0
}

echo "🔧 正在启动后端服务..."
cd server
source .venv/bin/activate

# 如果端口被占用，先停止原有服务
if ! check_port 8001; then
    echo "🛑 停止端口8001上的现有服务..."
    pkill -f "uvicorn.*8001" || true
    sleep 2
fi

# 启动后端服务
nohup python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload > server.log 2>&1 &
SERVER_PID=$!
echo "✅ 后端服务已启动 (PID: $SERVER_PID)"

# 等待后端服务启动
sleep 3

# 检查后端服务是否正常运行
echo "🔍 检查后端服务状态..."
for i in {1..5}; do
    if curl -s http://$WSL_IP:8001/healthz > /dev/null 2>&1; then
        echo "✅ 后端服务运行正常"
        break
    else
        echo "⏳ 等待后端服务启动... ($i/5)"
        sleep 2
    fi
done

if ! curl -s http://$WSL_IP:8001/healthz > /dev/null 2>&1; then
    echo "❌ 后端服务启动失败，请检查日志"
    echo "📋 日志内容:"
    tail -10 server/server.log
    exit 1
fi

cd ..

echo "🎨 正在启动前端服务..."
cd web

# 如果端口被占用，先停止原有服务
if ! check_port 3000; then
    echo "🛑 停止端口3000上的现有服务..."
    pkill -f "next.*3000" || true
    sleep 2
fi

# 启动前端服务
nohup pnpm dev --hostname 0.0.0.0 --port 3000 > web.log 2>&1 &
WEB_PID=$!
echo "✅ 前端服务已启动 (PID: $WEB_PID)"

# 等待前端服务启动
sleep 5

cd ..

echo ""
echo "🎉 RAG知识库机器人系统启动完成！"
echo ""
echo "📍 访问地址:"
echo "  🔗 后端API: http://$WSL_IP:8001"
echo "  📚 API文档: http://$WSL_IP:8001/docs"
echo "  💬 聊天界面: http://$WSL_IP:3000/chat"
echo ""
echo "📊 服务状态:"
echo "  ✅ 后端服务: 运行中 (端口: 8001)"
echo "  ✅ 前端服务: 运行中 (端口: 3000)"
echo ""
echo "📝 日志文件:"
echo "  📄 后端日志: server/server.log"
echo "  📄 前端日志: web/web.log"
echo ""
echo "🛑 停止服务:"
echo "  执行: pkill -f uvicorn; pkill -f next"
echo ""

# 保存PID到文件
echo $SERVER_PID > server.pid
echo $WEB_PID > web.pid

echo "✨ 系统已就绪，请在Windows浏览器中访问聊天界面！"