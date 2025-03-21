#!/bin/bash

# Exit on any error
set -e

echo "==================================="
echo "Starting MCP Server"
echo "==================================="

# Create logs directory if it doesn't exist
mkdir -p logs

# Kill any existing MCP server processes
echo "Checking for existing MCP server processes..."
pkill -f "node.*mcp-server" || true
sleep 2

# Double check no processes are left
if pgrep -f "node.*mcp-server" > /dev/null; then
    echo "Error: Failed to kill existing MCP server processes"
    exit 1
fi

# Check if port 3000 is in use
echo "Checking if port 3000 is available..."
if lsof -i :3000 > /dev/null 2>&1; then
    echo "Error: Port 3000 is already in use"
    exit 1
fi

# Build the server
echo "Building server..."
npm run build

# Start the server
echo "Starting server..."
TIMESTAMP=$(date +"%Y-%m-%d-%H-%M-%S")
LOG_FILE="logs/server-$TIMESTAMP.log"

# Run with DEBUG enabled for verbose logging
DEBUG=* node dist/mcp-server.js > "$LOG_FILE" 2>&1 &
SERVER_PID=$!

echo "Server started with PID $SERVER_PID"
echo "Logs are being written to $LOG_FILE"

# Wait for server to start and verify it's running
echo "Waiting for server to start..."
for i in {1..5}; do
    if ! ps -p $SERVER_PID > /dev/null; then
        echo "Error: Server process died"
        cat "$LOG_FILE"
        exit 1
    fi
    
    if curl -s http://localhost:3000/health > /dev/null; then
        echo "Server is running and responding"
        echo "You can monitor the logs with: tail -f $LOG_FILE"
        exit 0
    fi
    
    echo "Attempt $i: Waiting for server to respond..."
    sleep 1
done

echo "Error: Server failed to respond within 5 seconds"
kill -9 $SERVER_PID 2>/dev/null || true
cat "$LOG_FILE"
exit 1 