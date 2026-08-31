import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime
from backend.app.schemas import CalendarEventSchema


class CalendarService:
    """Manages calendar meetings and scheduled invitations."""

    def __init__(self):
        self._events: Dict[str, CalendarEventSchema] = {}
        # Prepopulate with a couple of realistic upcoming meetings
        self._init_sample_events()

    def _init_sample_events(self):
        today_str = datetime.now().strftime("%Y-%m-%d")
        sample_1 = CalendarEventSchema(
            id="evt_1",
            subject="Sprint Architecture Sync",
            attendees=["lance@company.com", "sarah.j@partner.com"],
            preferred_day=f"{today_str} 2:00 PM - 2:30 PM",
            duration_minutes=30,
            confirmed=True,
        )
        sample_2 = CalendarEventSchema(
            id="evt_2",
            subject="Q3 AI Infrastructure Review",
            attendees=["lance@company.com", "teamlead@company.com"],
            preferred_day=f"{today_str} 4:00 PM - 5:00 PM",
            duration_minutes=60,
            confirmed=True,
        )
        self._events[sample_1.id] = sample_1
        self._events[sample_2.id] = sample_2

    def list_events(self) -> List[CalendarEventSchema]:
        return list(self._events.values())

    def add_event(self, subject: str, attendees: List[str], preferred_day: str, duration_minutes: int = 30, confirmed: bool = False) -> CalendarEventSchema:
        event_id = f"evt_{uuid.uuid4().hex[:6]}"
        event = CalendarEventSchema(
            id=event_id,
            subject=subject,
            attendees=attendees,
            preferred_day=preferred_day,
            duration_minutes=duration_minutes,
            confirmed=confirmed,
        )
        self._events[event_id] = event
        return event

    def confirm_event(self, event_id: str) -> Optional[CalendarEventSchema]:
        event = self._events.get(event_id)
        if event:
            event.confirmed = True
        return event


calendar_service = CalendarService()
