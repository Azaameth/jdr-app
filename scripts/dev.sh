#!/usr/bin/env bash
# Start/stop the local Vite dev server as a tracked background process.
#
# Runs vite directly (not via `npm run dev`) and in its own session
# (`setsid`), so `stop` can kill the whole process group in one shot instead
# of leaving orphaned children behind — port 5173 getting stuck occupied by a
# stray process was a repeat problem before this script existed.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Pick up the fnm-managed Node version pinned in .node-version. Without this,
# a script invoked outside an interactive shell falls back to the system
# Node (18.x here, EOL, and too old for this project's Vite/Rolldown
# toolchain) instead of the 22.x this project actually needs.
export PATH="$HOME/.local/share/fnm:$PATH"
if command -v fnm >/dev/null 2>&1; then
  eval "$(fnm env --shell bash)"
  fnm use >/dev/null 2>&1 || true
fi

RUN_DIR=".run"
PID_FILE="$RUN_DIR/dev.pid"
LOG_FILE="$RUN_DIR/dev.log"
PORT="${DEV_PORT:-5173}"

is_running() {
  [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null
}

start() {
  if is_running; then
    echo "Dev server already running (PID $(cat "$PID_FILE")) — http://localhost:$PORT/jdr-app/"
    return 0
  fi
  mkdir -p "$RUN_DIR"
  rm -f "$PID_FILE"
  echo "Starting dev server on port $PORT (log: $LOG_FILE)..."
  setsid nohup npx vite --port "$PORT" --strictPort >"$LOG_FILE" 2>&1 </dev/null &
  echo $! >"$PID_FILE"
  sleep 1
  if is_running; then
    echo "Dev server started (PID $(cat "$PID_FILE")) — http://localhost:$PORT/jdr-app/"
  else
    echo "Dev server failed to start — check $LOG_FILE" >&2
    rm -f "$PID_FILE"
    exit 1
  fi
}

stop() {
  if ! is_running; then
    echo "Dev server is not running."
    rm -f "$PID_FILE"
    return 0
  fi
  local pid
  pid="$(cat "$PID_FILE")"
  echo "Stopping dev server (PID $pid, and its process group)..."
  kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
  for _ in $(seq 1 10); do
    kill -0 "$pid" 2>/dev/null || break
    sleep 0.5
  done
  if kill -0 "$pid" 2>/dev/null; then
    echo "Still running after 5s, force killing..."
    kill -9 -- "-$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null || true
  fi
  rm -f "$PID_FILE"
  echo "Dev server stopped."
}

status() {
  if is_running; then
    echo "Dev server running (PID $(cat "$PID_FILE")) — http://localhost:$PORT/jdr-app/"
  else
    echo "Dev server is not running."
  fi
}

case "${1:-}" in
  start) start ;;
  stop) stop ;;
  restart) stop; start ;;
  status) status ;;
  *)
    echo "Usage: $0 {start|stop|restart|status}" >&2
    echo "  DEV_PORT=<port> to override the default of 5173." >&2
    exit 1
    ;;
esac
