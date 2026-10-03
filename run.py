#!/usr/bin/env python3
"""
AI Email Assistant Launcher
Runs the FastAPI backend and provides access to the modern web dashboard.
"""
import os
import sys
import uvicorn
from backend.app.config import settings

if __name__ == "__main__":
    print("=" * 65)
    print("🤖 Starting AI Email Assistant Server...")
    print(f"📡 API & Dashboard available at: http://{settings.HOST}:{settings.PORT}")
    print(f"📖 Swagger API Docs available at: http://{settings.HOST}:{settings.PORT}/docs")
    print("=" * 65)
    
    is_reload = settings.PORT == 8000 and not os.getenv("RENDER")
    
    uvicorn.run(
        "backend.app.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=is_reload,
    )
