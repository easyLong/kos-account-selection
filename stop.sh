#!/bin/bash

# ==============================================================================
# KOS 账号海选报名系统 - 服务停止脚本 (stop.sh)
# ==============================================================================

cd "$(dirname "$0")"
PROJECT_DIR="$(pwd)"
PID_FILE="$PROJECT_DIR/.app.pid"
PORT=5173

echo "===================================================="
echo "  正在停止 KOS 账号海选服务..."
echo "===================================================="

STOPPED=false

# 1. 尝试从 PID 文件读取进程号停止
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" >/dev/null 2>&1; then
        echo "🛑 正在终止进程 (PID: $PID)..."
        kill "$PID" 2>/dev/null
        
        # 等待平滑退出
        for i in {1..5}; do
            if ! ps -p "$PID" >/dev/null 2>&1; then
                STOPPED=true
                break
            fi
            sleep 1
        done

        # 如果还在运行，强制杀死
        if ps -p "$PID" >/dev/null 2>&1; then
            echo "⚠️  进程未正常退出，正在执行强制关闭 (kill -9)..."
            kill -9 "$PID" 2>/dev/null
            STOPPED=true
        fi
    else
        echo "ℹ️  PID 文件中的进程 ($PID) 已不在运行。"
    fi
    rm -f "$PID_FILE"
fi

# 2. 检查是否有端口残留占用
PORT_PIDS=$(lsof -ti :"$PORT" 2>/dev/null)
if [ -z "$PORT_PIDS" ]; then
    PORT_PIDS=$(netstat -tlnp 2>/dev/null | grep ":$PORT " | awk '{print $7}' | cut -d'/' -f1)
fi

if [ -n "$PORT_PIDS" ]; then
    echo "🔍 发现端口 $PORT 仍有残留进程: $PORT_PIDS，正在清理..."
    for p in $PORT_PIDS; do
        kill -9 "$p" 2>/dev/null
    done
    STOPPED=true
fi

if [ "$STOPPED" = true ]; then
    echo "✅ 服务已成功停止！"
else
    echo "ℹ️  当前没有运行中的服务。"
fi
echo "===================================================="
