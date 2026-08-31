from typing import List, Optional
from fastapi import APIRouter, HTTPException
from backend.app.schemas import CalendarEventSchema
from backend.app.services.calendar_service import calendar_service

router = APIRouter(prefix="/calendar")


@router.get("/events", response_model=List[CalendarEventSchema])
def list_calendar_events():
    """List all scheduled and confirmed calendar meetings."""
    return calendar_service.list_events()


@router.post("/events", response_model=CalendarEventSchema)
def create_calendar_event(payload: CalendarEventSchema):
    """Schedule a new calendar meeting."""
    return calendar_service.add_event(
        subject=payload.subject,
        attendees=payload.attendees,
        preferred_day=payload.preferred_day,
        duration_minutes=payload.duration_minutes,
        confirmed=payload.confirmed,
    )


@router.post("/events/{event_id}/confirm", response_model=CalendarEventSchema)
def confirm_event(event_id: str):
    """Confirm a tentative calendar invitation."""
    event = calendar_service.confirm_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Calendar event not found")
    return event
