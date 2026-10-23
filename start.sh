#!/bin/bash

# ==============================================================================
# KOS 账号海选报名系统 - 服务启动脚本 (start.sh)
# ==============================================================================

# 进入脚本所在根目录
cd "$(dirname "$0")"
PROJECT_DIR="$(pwd)"
PID_FILE="$PROJECT_DIR/.app.pid"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/app.log"
PORT=5173

mkdir -p "$LOG_DIR"
mkdir -p "$PROJECT_DIR/public/uploads/videos"
mkdir -p "$PROJECT_DIR/public/uploads/avatars"

echo "===================================================="
echo "  正在准备启动 KOS 账号海选服务..."
echo "===================================================="

# 1. 检查 Node.js 环境
if ! command -v node >/dev/null 2>&1; then
    echo "❌ 错误: 未检测到 Node.js 环境，请先在服务器安装 Node.js (推荐 v18+ 或 v20+)"
    exit 1
fi

# 2. 检查依赖包
if [ ! -d "$PROJECT_DIR/node_modules" ]; then
    echo "📦 首次部署，正在安装项目依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败，请检查网络或配置"
        exit 1
    fi
fi

# 3. 检查生产构建包 (dist)
if [ ! -d "$PROJECT_DIR/dist" ] || [ ! -f "$PROJECT_DIR/dist/index.html" ]; then
    echo "⚙️  未检测到生产静态包，正在执行 npm run build 构建..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "❌ 项目构建失败，请检查构建日志"
        exit 1
    fi
fi

# 4. 检查是否已经在运行
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" >/dev/null 2>&1; then
        echo "⚠️  服务已经在运行中！PID: $PID"
        echo "👉 如需重启请执行: ./stop.sh && ./start.sh"
        exit 0
    else
        rm -f "$PID_FILE"
    fi
fi

# 5. 检查端口是否被占用
PORT_OCCUPIED=$(netstat -tlnp 2>/dev/null | grep ":$PORT " || ss -tlnp 2>/dev/null | grep ":$PORT " || lsof -i:"$PORT" 2>/dev/null)
if [ -n "$PORT_OCCUPIED" ]; then
    echo "⚠️  端口 $PORT 已被其他进程占用，请先释放端口或在 server/.env 中修改 PORT"
    exit 1
fi

# 6. 后台启动服务
echo "🚀 正在启动服务 (端口: $PORT)..."
nohup node server/prodServer.js > "$LOG_FILE" 2>&1 &
NEW_PID=$!
echo "$NEW_PID" > "$PID_FILE"

# 等待 2 秒检查进程存活状态
sleep 2
if ps -p "$NEW_PID" >/dev/null 2>&1; then
    echo "✅ 服务启动成功！"
    echo "  ➜ 进程 PID: $NEW_PID"
    echo "  ➜ 监听绑定: http://0.0.0.0:$PORT (支持所有公网与内网IP访问)"
    echo "  ➜ 运行日志: $LOG_FILE"
    echo "===================================================="
    echo "👉 查看运行状态: ./status.sh"
    echo "👉 停止服务命令: ./stop.sh"
    echo "👉 实时查看日志: tail -f logs/app.log"
    echo "===================================================="
else
    echo "❌ 服务启动失败，请查看日志排查:"
    echo "----------------------------------------------------"
    tail -n 20 "$LOG_FILE"
    echo "----------------------------------------------------"
    rm -f "$PID_FILE"
    exit 1
fi
