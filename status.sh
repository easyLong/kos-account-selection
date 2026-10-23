#!/bin/bash

# ==============================================================================
# KOS 账号海选报名系统 - 服务状态检查脚本 (status.sh)
# ==============================================================================

cd "$(dirname "$0")"
PROJECT_DIR="$(pwd)"
PID_FILE="$PROJECT_DIR/.app.pid"
LOG_FILE="$PROJECT_DIR/logs/app.log"
PORT=5173

echo "===================================================="
echo "         KOS 账号海选系统 - 运行状态"
echo "===================================================="

IS_RUNNING=false
CURRENT_PID=""

if [ -f "$PID_FILE" ]; then
    CURRENT_PID=$(cat "$PID_FILE")
    if ps -p "$CURRENT_PID" >/dev/null 2>&1; then
        IS_RUNNING=true
    fi
fi

# 备用检测：通过端口检测
if [ "$IS_RUNNING" = false ]; then
    PORT_PID=$(lsof -ti :"$PORT" 2>/dev/null)
    if [ -n "$PORT_PID" ]; then
        IS_RUNNING=true
        CURRENT_PID="$PORT_PID"
        echo "$CURRENT_PID" > "$PID_FILE"
    fi
fi

if [ "$IS_RUNNING" = true ]; then
    echo "🟢 服务状态: 正常运行中 (RUNNING)"
    echo "  ➜ 进程 PID: $CURRENT_PID"
    echo "  ➜ 监听端口: $PORT"
    
    # 显示内存与 CPU 占用
    if command -v ps >/dev/null 2>&1; then
        USAGE=$(ps -p "$CURRENT_PID" -o %cpu,%mem,etime 2>/dev/null | tail -n 1)
        echo "  ➜ 资源占用: CPU: $(echo $USAGE | awk '{print $1}')% | 内存: $(echo $USAGE | awk '{print $2}')% | 运行时长: $(echo $USAGE | awk '{print $3}')"
    fi

    # 统计已上传的视频数量
    VIDEO_DIR="$PROJECT_DIR/public/uploads/videos"
    if [ -d "$VIDEO_DIR" ]; then
        VIDEO_COUNT=$(find "$VIDEO_DIR" -type f | wc -l)
        echo "  ➜ 已上传视频: ${VIDEO_COUNT} 个"
    fi
else
    echo "🔴 服务状态: 未运行 (STOPPED)"
    echo "  ➜ 提示: 可以执行 ./start.sh 启动服务"
fi

echo "----------------------------------------------------"
echo "📜 最近 10 行日志 (logs/app.log):"
if [ -f "$LOG_FILE" ]; then
    tail -n 10 "$LOG_FILE"
else
    echo "  (暂无日志文件)"
fi
echo "===================================================="
