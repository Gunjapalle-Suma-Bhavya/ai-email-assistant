"""API Routers Package"""
from fastapi import APIRouter
from backend.app.api.auth import router as auth_router
from backend.app.api.google_auth import (
    router as google_auth_router,
    sync_router as google_sync_router,
    accounts_router as accounts_router,
)
from backend.app.api.emails import router as emails_router
from backend.app.api.drafts import router as drafts_router
from backend.app.api.triage import router as triage_router
from backend.app.api.hitl import router as hitl_router
from backend.app.api.memory import router as memory_router
from backend.app.api.calendar import router as calendar_router
from backend.app.api.feedback import router as feedback_router
from backend.app.api.webhooks import router as webhooks_router

api_router = APIRouter(prefix="/api")

api_router.include_router(auth_router, tags=["Authentication"])
api_router.include_router(google_auth_router, tags=["Google Authentication"])
api_router.include_router(google_sync_router, tags=["Google Sync"])
api_router.include_router(accounts_router, tags=["Account Switcher"])
api_router.include_router(emails_router, tags=["Emails"])
api_router.include_router(drafts_router, tags=["Drafts"])
api_router.include_router(triage_router, tags=["AI Triage"])
api_router.include_router(hitl_router, tags=["HITL Review & Actions"])
api_router.include_router(memory_router, tags=["Preferences & Memory"])
api_router.include_router(calendar_router, tags=["Calendar"])
api_router.include_router(feedback_router, tags=["Feedback & Learning"])
api_router.include_router(webhooks_router, tags=["Google Pub/Sub Webhooks"])
