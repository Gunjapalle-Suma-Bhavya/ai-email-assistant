"""API Routers Package"""
from fastapi import APIRouter
from backend.app.api.emails import router as emails_router
from backend.app.api.triage import router as triage_router
from backend.app.api.hitl import router as hitl_router
from backend.app.api.memory import router as memory_router
from backend.app.api.calendar import router as calendar_router

api_router = APIRouter(prefix="/api")

api_router.include_router(emails_router, tags=["Emails"])
api_router.include_router(triage_router, tags=["AI Triage"])
api_router.include_router(hitl_router, tags=["HITL Review & Actions"])
api_router.include_router(memory_router, tags=["Preferences & Memory"])
api_router.include_router(calendar_router, tags=["Calendar"])
