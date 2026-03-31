# Server Management Scripts

## Quick Start Guide

### 🛑 Stop All Servers
```bash
./stop-all.sh
```
This will:
- Stop all Node.js backend servers
- Stop all Vite frontend servers
- Free up ports 3001, 5173, and 5000
- Verify everything is stopped

### 🚀 Start All Servers
```bash
./start-all.sh
```
This will:
- Start the backend server on port 3001
- Start the frontend server on port 5173
- Check for conflicts and stop existing processes
- Show you the PIDs and URLs

## Manual Commands

### Stop Backend Only
```bash
pkill -f "node server.js"
# or
lsof -ti:3001 | xargs kill -9
```

### Stop Frontend Only
```bash
pkill -f "vite"
# or
lsof -ti:5173 | xargs kill -9
```

### Check What's Running
```bash
# Check ports
lsof -ti:3001,5173,5000

# Check processes
ps aux | grep -E "node|vite"
```

## Clean Start Workflow

1. **Stop everything:**
   ```bash
   ./stop-all.sh
   ```

2. **Start everything:**
   ```bash
   ./start-all.sh
   ```

3. **View logs:**
   ```bash
   # Backend logs
   tail -f server.log
   
   # Frontend logs
   tail -f client.log
   ```

## Ports Used

- **3001**: Backend API server (Express)
- **5173**: Frontend dev server (Vite)
- **5000**: Reserved (was blocked by macOS AirPlay)

## Troubleshooting

### Port Already in Use
If you get "port already in use" errors:
```bash
./stop-all.sh
# Wait 2 seconds
./start-all.sh
```

### Servers Won't Start
Check the log files:
```bash
cat server.log
cat client.log
```

### Manual Cleanup
If scripts don't work, manually kill processes:
```bash
# Find and kill all node processes
ps aux | grep node | grep -v grep | awk '{print $2}' | xargs kill -9

# Find and kill all vite processes
ps aux | grep vite | grep -v grep | awk '{print $2}' | xargs kill -9
```

