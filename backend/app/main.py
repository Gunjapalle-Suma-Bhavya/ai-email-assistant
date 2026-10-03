import os
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.app.config import settings
from backend.app.database.mongo import db
from backend.app.api import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: connect to MongoDB
    await db.connect()
    yield
    # Shutdown: disconnect from MongoDB
    await db.disconnect()


app = FastAPI(
    title="AI Email Assistant",
    description="Full-stack AI Email Assistant powered by LangGraph, FastAPI, MongoDB, and React",
    version="2.0.0",
    lifespan=lifespan,
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

# Locate Frontend directories
frontend_dir = settings.BASE_DIR / "frontend"
dist_dir = frontend_dir / "dist"

if dist_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(dist_dir / "assets")), name="assets")
elif frontend_dir.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_dir)), name="static")


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "mongodb_connected": db.is_connected,
        "database_name": settings.DATABASE_NAME,
        "llm_configured": bool(settings.OPENAI_API_KEY),
        "model": settings.OPENAI_MODEL,
    }


@app.get("/{full_path:path}")
def serve_spa(full_path: str):
    """Serve the single page application dashboard for all routes."""
    # Don't intercept API routes or docs
    if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
        return {"error": "Endpoint not found"}

    dist_index = dist_dir / "index.html"
    if dist_index.exists():
        return FileResponse(str(dist_index))

    index_file = frontend_dir / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))

    return {
        "message": "AI Email Assistant API is running.",
        "docs_url": "/docs",
        "api_url": "/api",
    }
