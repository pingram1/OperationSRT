#!/bin/bash

# Stop All Servers Script
# This script stops all Node.js servers and development servers

echo "🛑 Stopping all servers..."

# Kill all node processes related to this project
pkill -f "node server.js"
pkill -f "vite"
pkill -f "npm run dev"

# Kill processes on specific ports (force kill)
# Note: Port 5000 is often used by macOS AirPlay - we skip it
echo "Checking ports 3001, 5173..."
for port in 3001 5173; do
    PIDS=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$PIDS" ]; then
        echo "   Killing processes on port $port..."
        echo "$PIDS" | xargs kill -9 2>/dev/null
    fi
done

sleep 1

# Verify they're stopped
echo ""
echo "✅ Verification:"
APP_PORTS=$(lsof -ti:3001,5173 2>/dev/null)
if [ ! -z "$APP_PORTS" ]; then
    echo "⚠️  Some processes may still be running on ports 3001 or 5173"
    echo "$APP_PORTS"
else
    echo "✅ All application servers stopped successfully!"
    echo "   (Note: Port 5000 may be in use by macOS AirPlay - this is normal)"
fi

echo ""
echo "🎯 Ready for a clean start!"
echo "   To start server: cd server && node server.js"
echo "   To start client: cd client && npm run dev"

