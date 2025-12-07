#!/bin/sh

# Restore WhatsApp session from base64 environment variable
if [ -n "$WA_SESSION_BASE64" ]; then
    echo "📦 Restoring WhatsApp session from environment variable..."
    mkdir -p /app/session
    echo "$WA_SESSION_BASE64" | base64 -d > /app/session/store.db
    echo "✅ Session restored successfully!"
else
    echo "⚠️  No session found, will generate new QR code"
fi

# Start WA Gateway
./wa-gateway
