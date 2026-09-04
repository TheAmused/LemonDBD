#!/bin/sh

DISCORD_WEBHOOK="${DISCORD_TUNNEL_WEBHOOK:-https://discord.com/api/webhooks/1545340434585227316/oDf4oyzf83pHiKmL49SjVct7VZ6Uhpwhbl5m6vkTw7f6tXLYWqSiGiokqjICBA195HeS}"
TUNNEL_URL="${TUNNEL_TARGET_URL:-http://nginx:80}"
HOST_HEADER="${TUNNEL_HOST_HEADER:-}"

echo "=========================================================="
echo " Cloudflare Quick Tunnel Starting"
echo " Target: $TUNNEL_URL"
if [ -n "$HOST_HEADER" ]; then
  echo " Host Header: $HOST_HEADER"
fi
echo "=========================================================="

# Start cloudflared in the background and log output
if [ -n "$HOST_HEADER" ]; then
  cloudflared tunnel --url "$TUNNEL_URL" --http-host-header "$HOST_HEADER" > /tmp/tunnel.log 2>&1 &
else
  cloudflared tunnel --url "$TUNNEL_URL" > /tmp/tunnel.log 2>&1 &
fi

# Wait for Cloudflare to assign a URL (exclude api.trycloudflare.com)
echo "Waiting for Cloudflare Tunnel URL..."
URL=""
MAX_RETRIES=60
RETRY_COUNT=0

while [ -z "$URL" ] && [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  sleep 2
  URL=$(grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' /tmp/tunnel.log | grep -v 'api\.trycloudflare\.com' | head -n 1)
  RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ -n "$URL" ]; then
  echo ""
  echo "=========================================================="
  echo " Tunnel ready: $URL"
  echo "=========================================================="
  echo ""

  # Send URL to Discord
  if [ -n "$DISCORD_WEBHOOK" ]; then
    echo "Firing Discord Webhook notification..."
    curl -s -H "Content-Type: application/json" \
         -X POST \
         -d "{\"content\": \"🚀 **New Dev Server URL:** $URL\"}" \
         "$DISCORD_WEBHOOK"
    echo "Discord notification dispatched."
  fi
else
  echo "[ERROR] Failed to acquire Cloudflare Tunnel URL after $MAX_RETRIES retries."
  echo "--- Cloudflared output log ---"
  cat /tmp/tunnel.log
fi

# Keep container alive and stream logs
exec tail -f /tmp/tunnel.log