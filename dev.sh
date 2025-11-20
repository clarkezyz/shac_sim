#!/bin/bash
# SHAC Simulator - Full Dev Environment
# Runs both backend and frontend servers

echo "🎵 SHAC Simulator - Development Environment"
echo "==========================================="
echo ""
echo "This will start TWO servers:"
echo "  Backend:  http://localhost:8000  (YouTube audio extraction)"
echo "  Frontend: http://localhost:8765  (SHAC Simulator)"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Shutting down servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend in background
echo "Starting backend server..."
cd backend
source venv/bin/activate
python main.py &
BACKEND_PID=$!
cd ..

# Wait a bit for backend to start
sleep 2

# Start frontend in background
echo "Starting frontend server..."
python3 -m http.server 8765 &
FRONTEND_PID=$!

echo ""
echo "✅ Servers running!"
echo ""
echo "📱 Open your browser:"
echo "   http://localhost:8765"
echo ""
echo "🔧 Backend API docs:"
echo "   http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for user interrupt
wait
