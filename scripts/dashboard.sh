#!/usr/bin/env bash
# Start/stop the spec-kitty dashboard as a tracked background process.
#
# `spec-kitty dashboard` daemonizes itself internally — the process this
# script launches exits as soon as it has handed off to the real server, so
# a captured `$!` PID goes stale immediately. Ground truth here is instead
# "is something listening on the dashboard's port", which also means `stop`
# works whether the dashboard was started by this script or ad-hoc.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

RUN_DIR=".run"
LOG_FILE="$RUN_DIR/dashboard.log"
PORT="${DASHBOARD_PORT:-4173}"

pid_on_port() {
  ss -ltnp 2>/dev/null | grep ":$PORT\b" | grep -oP 'pid=\K[0-9]+' | head -1
}

is_running() {
  [[ -n "$(pid_on_port)" ]]
}

start() {
  if is_running; then
    echo "Dashboard already running (PID $(pid_on_port)) — http://127.0.0.1:$PORT"
    return 0
  fi
  mkdir -p "$RUN_DIR"
  echo "Starting spec-kitty dashboard on port $PORT (log: $LOG_FILE)..."
  setsid nohup spec-kitty dashboard --port "$PORT" >"$LOG_FILE" 2>&1 </dev/null &
  disown
  for _ in $(seq 1 10); do
    is_running && break
    sleep 0.5
  done
  if is_running; then
    echo "Dashboard started (PID $(pid_on_port)) — http://127.0.0.1:$PORT"
  else
    echo "Dashboard failed to start — check $LOG_FILE" >&2
    exit 1
  fi
}

stop() {
  if ! is_running; then
    echo "Dashboard is not running."
    return 0
  fi
  echo "Stopping spec-kitty dashboard..."
  spec-kitty dashboard --kill 2>&1 || true
  # Belt-and-suspenders: --kill uses spec-kitty's own metadata, which could
  # be stale (dashboard started outside this script, or a prior crash). If
  # the port is still occupied, kill whatever's bound to it directly.
  if is_running; then
    local pid
    pid="$(pid_on_port)"
    kill "$pid" 2>/dev/null || true
    sleep 0.5
    if is_running; then
      kill -9 "$(pid_on_port)" 2>/dev/null || true
    fi
  fi
  echo "Dashboard stopped."
}

status() {
  if is_running; then
    echo "Dashboard running (PID $(pid_on_port)) — http://127.0.0.1:$PORT"
  else
    echo "Dashboard is not running."
  fi
}

case "${1:-}" in
  start) start ;;
  stop) stop ;;
  restart) stop; start ;;
  status) status ;;
  *)
    echo "Usage: $0 {start|stop|restart|status}" >&2
    echo "  DASHBOARD_PORT=<port> to override the default of 4173." >&2
    exit 1
    ;;
esac
