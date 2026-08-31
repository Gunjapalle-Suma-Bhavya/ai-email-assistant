from typing import Literal, Optional, List, Dict, Any
from pydantic import BaseModel, Field


class EmailItem(BaseModel):
    id: str
    author: str
    to: str
    subject: str
    email_thread: str
    received_at: Optional[str] = None
    status: Literal["unread", "read", "triaged", "drafted", "sent", "ignored"] = "unread"
    classification: Optional[Literal["respond", "notify", "ignore"]] = None
    reasoning: Optional[str] = None
    draft_response: Optional[str] = None
    draft_subject: Optional[str] = None
    calendar_event: Optional[Dict[str, Any]] = None
    feedback_history: List[str] = Field(default_factory=list)


class EmailCreate(BaseModel):
    author: str
    to: str
    subject: str
    email_thread: str


class RouterSchema(BaseModel):
    """Structured LLM output for email triage classification."""
    reasoning: str = Field(description="Step-by-step reasoning behind the classification.")
    classification: Literal["ignore", "respond", "notify"] = Field(
        description="The classification: 'ignore' for irrelevant emails, 'notify' for important info not needing response, 'respond' for emails needing reply."
    )


class TriageRequest(BaseModel):
    email_id: Optional[str] = None
    email_data: Optional[EmailCreate] = None


class TriageResponse(BaseModel):
    email_id: Optional[str]
    classification: Literal["respond", "notify", "ignore"]
    reasoning: str


class DraftRequest(BaseModel):
    email_id: Optional[str] = None
    email_data: Optional[EmailCreate] = None
    custom_instructions: Optional[str] = None


class DraftResponse(BaseModel):
    email_id: Optional[str]
    subject: str
    to: str
    body: str
    tool_name: str
    calendar_event: Optional[Dict[str, Any]] = None
    requires_hitl: bool = True


class HITLActionRequest(BaseModel):
    email_id: str
    action: Literal["accept", "edit", "ignore", "feedback"]
    edited_to: Optional[str] = None
    edited_subject: Optional[str] = None
    edited_body: Optional[str] = None
    user_feedback: Optional[str] = None
    calendar_event: Optional[Dict[str, Any]] = None


class HITLActionResponse(BaseModel):
    success: bool
    message: str
    email_id: str
    status: str
    memory_updated: bool = False


class UserPreferences(BaseModel):
    """Updated user preferences generated from feedback."""
    chain_of_thought: str = Field(description="Reasoning about how user preferences should be updated based on feedback.")
    user_preferences: str = Field(description="Updated preference rules in clear markdown bullet points.")


class PreferencesPayload(BaseModel):
    background: Optional[str] = None
    triage_instructions: Optional[str] = None
    response_preferences: Optional[str] = None
    cal_preferences: Optional[str] = None


class CalendarEventSchema(BaseModel):
    id: Optional[str] = None
    subject: str
    attendees: List[str]
    preferred_day: str
    duration_minutes: int = 30
    confirmed: bool = False
