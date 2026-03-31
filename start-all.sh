#!/bin/bash

# Start All Servers Script
# This script starts both the backend and frontend servers

echo "🚀 Starting all servers..."

# Check if ports are already in use
if lsof -ti:3001 2>/dev/null | grep -q .; then
    echo "⚠️  Port 3001 is already in use. Stopping existing process..."
    lsof -ti:3001 | xargs kill -9 2>/dev/null
    sleep 1
fi

if lsof -ti:5173 2>/dev/null | grep -q .; then
    echo "⚠️  Port 5173 is already in use. Stopping existing process..."
    lsof -ti:5173 | xargs kill -9 2>/dev/null
    sleep 1
fi

# Start backend server
echo "📦 Starting backend server on port 3001..."
cd server
node server.js > ../server.log 2>&1 &
SERVER_PID=$!
echo "   Backend PID: $SERVER_PID"

# Wait a moment for server to start
sleep 2

# Check if server started successfully
if kill -0 $SERVER_PID 2>/dev/null; then
    echo "✅ Backend server started successfully"
else
    echo "❌ Backend server failed to start. Check server.log for errors."
    exit 1
fi

# Start frontend server
echo "🎨 Starting frontend server on port 5173..."
cd ../client
npm run dev > ../client.log 2>&1 &
CLIENT_PID=$!
echo "   Frontend PID: $CLIENT_PID"

# Wait a moment for client to start
sleep 3

# Check if client started successfully
if kill -0 $CLIENT_PID 2>/dev/null; then
    echo "✅ Frontend server started successfully"
else
    echo "❌ Frontend server failed to start. Check client.log for errors."
    exit 1
fi

echo ""
echo "🎉 All servers are running!"
echo "   Backend:  http://localhost:3001"
echo "   Frontend: http://localhost:5173"
echo ""
echo "   To stop all servers: ./stop-all.sh"
echo "   Logs: server.log and client.log"
echo ""
echo "   Press Ctrl+C to stop this script (servers will continue running)"

