import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from backend.app.schemas import CalendarEventSchema
from backend.app.auth.dependencies import get_optional_user
from backend.app.database.mongo import db
from backend.app.services.google_service import google_service

logger = logging.getLogger("api.calendar")

router = APIRouter(prefix="/calendar")


def resolve_user_id(user: Optional[dict]) -> str:
    return user.get("_id", user.get("id", "default_user")) if user else "default_user"


@router.get("/events", response_model=List[CalendarEventSchema])
async def list_calendar_events(current_user: Optional[dict] = Depends(get_optional_user)):
    """List all scheduled and confirmed calendar meetings for the active user."""
    user_id = resolve_user_id(current_user)

    # If user has a connected Google account, sync live events and purge mocks
    if current_user and current_user.get("google_tokens"):
        await db.clear_mock_calendar_events(user_id)
        try:
            live_events = google_service.fetch_calendar_events(current_user)
            for evt in live_events:
                evt_doc = {
                    "_id": f"cal_google_{evt.get('google_event_id', '')}",
                    "user_id": user_id,
                    "subject": evt["subject"],
                    "preferred_day": evt["preferred_day"],
                    "duration_minutes": evt.get("duration_minutes", 30),
                    "confirmed": True,
                    "hangout_link": evt.get("hangout_link"),
                    "attendees": evt.get("attendees", []),
                    "source": "google_calendar",
                }
                await db.add_calendar_event(evt_doc)
        except Exception as e:
            logger.warning(f"Error auto-syncing Google Calendar events: {e}")

    events = await db.list_calendar_events(user_id)

    # For Google connected users, strictly exclude any leftover mock events
    if current_user and current_user.get("google_tokens"):
        events = [e for e in events if e.get("subject") not in ["Sprint Architecture Sync", "Q3 AI Infrastructure Review"]]

    return events


@router.post("/events", response_model=CalendarEventSchema)
async def create_calendar_event(payload: CalendarEventSchema, current_user: Optional[dict] = Depends(get_optional_user)):
    """Schedule a new calendar meeting."""
    user_id = resolve_user_id(current_user)
    doc = {
        "user_id": user_id,
        "subject": payload.subject,
        "attendees": payload.attendees,
        "preferred_day": payload.preferred_day,
        "duration_minutes": payload.duration_minutes,
        "confirmed": payload.confirmed,
    }
    return await db.add_calendar_event(doc)


@router.post("/events/{event_id}/confirm", response_model=CalendarEventSchema)
async def confirm_event(event_id: str, current_user: Optional[dict] = Depends(get_optional_user)):
    """Confirm a tentative calendar invitation."""
    user_id = resolve_user_id(current_user)
    event = await db.confirm_calendar_event(event_id, user_id)
    if not event:
        raise HTTPException(status_code=404, detail="Calendar event not found")
    return event
