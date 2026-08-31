import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.app.config import settings
from backend.app.api import api_router

app = FastAPI(
    title="AI Email Assistant",
    description="Full-stack AI Email Assistant powered by LangGraph, FastAPI, and Human-in-the-Loop memory",
    version="1.0.0",
)

# CORS middleware for development and frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include core API routes
app.include_router(api_router)

# Locate Frontend directory
frontend_dir = settings.BASE_DIR / "frontend"

if frontend_dir.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_dir)), name="static")


@app.get("/")
def serve_frontend():
    """Serve the single page application dashboard."""
    index_file = frontend_dir / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {
        "message": "AI Email Assistant API is running.",
        "docs_url": "/docs",
        "api_url": "/api",
    }


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "llm_configured": bool(settings.OPENAI_API_KEY),
        "model": settings.OPENAI_MODEL,
    }
