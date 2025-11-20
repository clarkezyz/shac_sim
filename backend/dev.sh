#!/bin/bash
# Development server startup script

echo "🎵 SHAC Simulator YouTube Backend - Dev Server"
echo "=============================================="
echo ""

# Activate virtual environment
source venv/bin/activate

# Start the server
echo "Starting FastAPI server on http://localhost:8000"
echo "Press Ctrl+C to stop"
echo ""

python main.py
