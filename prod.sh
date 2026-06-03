#!/usr/bin/env bash
# prod.sh — Production environment build/start/stop/restart/status/logs
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$ROOT_DIR/run/app.pid"
LOG_FILE="$ROOT_DIR/run/app.log"
PORT="${PORT:-8000}"
HOST="${HOST:-0.0.0.0}"

ensure_run_dir() {
    mkdir -p "$ROOT_DIR/run"
}

get_pid() {
    if [ -f "$PID_FILE" ]; then
        cat "$PID_FILE"
    fi
}

is_running() {
    local pid
    pid=$(get_pid)
    [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

cmd_build() {
    echo "Building frontend..."
    cd "$ROOT_DIR/frontend"
    npm run build
    echo "Build complete. Output: frontend/dist/"
}

cmd_start() {
    if is_running; then
        echo "Already running (PID: $(get_pid))"
        exit 0
    fi

    if [ ! -d "$ROOT_DIR/frontend/dist" ]; then
        echo "frontend/dist/ not found. Run '$0 build' first."
        exit 1
    fi

    ensure_run_dir
    echo "Starting production server on ${HOST}:${PORT}..."
    cd "$ROOT_DIR/backend"
    nohup uvicorn app.main:app --host "$HOST" --port "$PORT" \
        >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"

    # Wait briefly to confirm startup
    sleep 2
    if is_running; then
        echo "Started (PID: $(get_pid))"
        echo "App: http://localhost:${PORT}"
        echo "Logs: $LOG_FILE"
    else
        echo "Failed to start. Check logs: $LOG_FILE"
        exit 1
    fi
}

cmd_stop() {
    if ! is_running; then
        echo "Not running."
        rm -f "$PID_FILE"
        exit 0
    fi

    local pid
    pid=$(get_pid)
    echo "Stopping (PID: $pid)..."
    kill "$pid"

    # Wait for graceful shutdown
    for i in $(seq 1 10); do
        if ! is_running; then
            break
        fi
        sleep 1
    done

    # Force kill if needed
    if is_running; then
        echo "Force killing..."
        kill -9 "$pid" 2>/dev/null || true
    fi

    rm -f "$PID_FILE"
    echo "Stopped."
}

cmd_restart() {
    cmd_stop
    cmd_start
}

cmd_status() {
    if is_running; then
        echo "Running (PID: $(get_pid))"
        echo "App: http://localhost:${PORT}"
    else
        echo "Not running."
        rm -f "$PID_FILE" 2>/dev/null
    fi
}

cmd_logs() {
    if [ ! -f "$LOG_FILE" ]; then
        echo "No log file: $LOG_FILE"
        exit 1
    fi
    tail -f "$LOG_FILE"
}

case "${1:-}" in
    build)   cmd_build   ;;
    start)   cmd_start   ;;
    stop)    cmd_stop    ;;
    restart) cmd_restart ;;
    status)  cmd_status  ;;
    logs)    cmd_logs    ;;
    *)
        echo "Usage: $0 {build|start|stop|restart|status|logs}"
        echo ""
        echo "  build   — Build frontend (vite build)"
        echo "  start   — Start production server (uvicorn + static files)"
        echo "  stop    — Stop production server"
        echo "  restart — Stop then start"
        echo "  status  — Check if server is running"
        echo "  logs    — Tail the production log"
        echo ""
        echo "Environment:"
        echo "  PORT  — Port to listen on (default: 8000)"
        echo "  HOST  — Host to bind to (default: 0.0.0.0)"
        exit 1
        ;;
esac
