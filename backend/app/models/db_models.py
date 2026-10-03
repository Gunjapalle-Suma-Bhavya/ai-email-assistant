"""Database Document Models for MongoDB Collections."""
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from pydantic import BaseModel, Field


class UserModel(BaseModel):
    id: str = Field(alias="_id")
    email: str
    full_name: str
    hashed_password: str
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    is_active: bool = True

    class Config:
        populate_by_name = True


class EmailModel(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    author: str
    to: str
    subject: str
    email_thread: str
    received_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    status: Literal["unread", "read", "triaged", "drafted", "sent", "ignored"] = "unread"
    classification: Optional[Literal["respond", "notify", "ignore"]] = None
    reasoning: Optional[str] = None
    confidence_score: Optional[float] = 0.95
    draft_response: Optional[str] = None
    draft_subject: Optional[str] = None
    calendar_event: Optional[Dict[str, Any]] = None
    feedback_history: List[str] = Field(default_factory=list)

    class Config:
        populate_by_name = True


class DraftModel(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    email_id: str
    subject: str
    to: str
    body: str
    tool_name: str = "write_email"
    calendar_event: Optional[Dict[str, Any]] = None
    status: Literal["pending_review", "approved", "edited", "rejected"] = "pending_review"
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    user_notes: Optional[str] = None

    class Config:
        populate_by_name = True


class PreferenceModel(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    background: str
    triage_instructions: str
    response_preferences: str
    cal_preferences: str
    learned_preferences: List[Dict[str, Any]] = Field(default_factory=list)
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

    class Config:
        populate_by_name = True


class CalendarEventModel(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    subject: str
    attendees: List[str]
    preferred_day: str
    duration_minutes: int = 30
    confirmed: bool = False
    source_email_id: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

    class Config:
        populate_by_name = True


class FeedbackModel(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    action_type: Literal["accept", "edit", "ignore", "feedback"]
    email_id: Optional[str] = None
    original_text: Optional[str] = None
    edited_text: Optional[str] = None
    feedback_note: str
    learned_rule: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

    class Config:
        populate_by_name = True
