#!/bin/bash
# ==============================================================================
# VEX V5 Match Reviewer & Maneuver Tagger - Launcher
# ==============================================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

PORT=8000
# Check if port 8000 is in use, find an available port
while lsof -i :$PORT >/dev/null 2>&1; do
  PORT=$((PORT + 1))
done

echo "=========================================================="
echo "🤖 Starting VEX V5 Match Reviewer on port $PORT..."
echo "📂 Directory: $DIR"
echo "🌐 URL: http://localhost:$PORT"
echo "=========================================================="

# Open the browser
if which open >/dev/null 2>&1; then
  # macOS
  sleep 0.5 && open "http://localhost:$PORT" &
elif which xdg-open >/dev/null 2>&1; then
  # Linux
  sleep 0.5 && xdg-open "http://localhost:$PORT" &
fi

# Run lightweight python HTTP server
python3 -m http.server $PORT
