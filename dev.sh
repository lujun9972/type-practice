#!/usr/bin/env bash
# dev.sh — Development environment start/stop/status
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$ROOT_DIR/run/dev.pid"
LOG_FILE="$ROOT_DIR/run/dev.log"

ensure_run_dir() {
    mkdir -p "$ROOT_DIR/run"
}

get_pids() {
    if [ -f "$PID_FILE" ]; then
        cat "$PID_FILE"
    fi
}

is_running() {
    for pid in $(get_pids); do
        if kill -0 "$pid" 2>/dev/null; then
            return 0
        fi
    done
    return 1
}

cmd_start() {
    if is_running; then
        echo "Already running (PID(s): $(get_pids | tr '\n' ' '))"
        exit 0
    fi

    ensure_run_dir
    echo "Starting development environment..."
    npx concurrently -n frontend,backend -c blue,green \
        "cd frontend && npm run dev" \
        "cd backend && uvicorn app.main:app --reload --port 8000" \
        > "$LOG_FILE" 2>&1 &
    MAIN_PID=$!

    # Wait briefly and capture all child processes
    sleep 2
    pstree -p "$MAIN_PID" 2>/dev/null | grep -oP '\(\K[0-9]+' | head -20 > "$PID_FILE" 2>/dev/null || echo "$MAIN_PID" > "$PID_FILE"

    if is_running; then
        echo "Started. Frontend: http://localhost:5173  Backend: http://localhost:8000"
        echo "Logs: $LOG_FILE"
        echo "Stop with: $0 stop"
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

    echo "Stopping..."
    for pid in $(get_pids); do
        kill "$pid" 2>/dev/null || true
    done

    # Wait for graceful shutdown
    for i in $(seq 1 10); do
        if ! is_running; then
            break
        fi
        sleep 1
    done

    # Force kill if still running
    for pid in $(get_pids); do
        if kill -0 "$pid" 2>/dev/null; then
            kill -9 "$pid" 2>/dev/null || true
        fi
    done

    rm -f "$PID_FILE"
    echo "Stopped."
}

cmd_status() {
    if is_running; then
        echo "Running (PID(s): $(get_pids | tr '\n' ' '))"
        echo "Frontend: http://localhost:5173"
        echo "Backend:  http://localhost:8000"
    else
        echo "Not running."
        rm -f "$PID_FILE" 2>/dev/null
    fi
}

case "${1:-}" in
    start)  cmd_start  ;;
    stop)   cmd_stop   ;;
    status) cmd_status ;;
    *)
        echo "Usage: $0 {start|stop|status}"
        echo ""
        echo "  start  — Start frontend + backend dev servers"
        echo "  stop   — Stop all dev processes"
        echo "  status — Check if dev servers are running"
        exit 1
        ;;
esac
