#!/usr/bin/env python3
"""
AI Email Assistant Launcher
Runs the FastAPI backend and provides access to the modern web dashboard.
"""
import sys
import uvicorn
from backend.app.config import settings

if __name__ == "__main__":
    print("=" * 65)
    print("🤖 Starting AI Email Assistant Server...")
    print(f"📡 API & Dashboard available at: http://{settings.HOST}:{settings.PORT}")
    print(f"📖 Swagger API Docs available at: http://{settings.HOST}:{settings.PORT}/docs")
    print("=" * 65)
    
    uvicorn.run(
        "backend.app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
    )
