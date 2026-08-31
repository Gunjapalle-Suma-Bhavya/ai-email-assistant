from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from langchain_core.tools import tool


class Done(BaseModel):
    """Mark the email task as completed."""
    done: bool = Field(description="Set to true when all actions for this email are completed.")


class Question(BaseModel):
    """Ask the user a clarifying question before taking action."""
    content: str = Field(description="The clarification question to ask the user.")


@tool
def write_email(to: str, subject: str, content: str) -> str:
    """Draft an email to the specified recipient with subject and body content."""
    return f"Draft prepared for {to} with subject '{subject}'. Content length: {len(content)} chars."


@tool
def check_calendar_availability(preferred_day: str, duration_minutes: int = 30) -> str:
    """Check calendar availability for proposed meeting times on a given date."""
    # Simulated intelligent calendar slot availability check
    available_slots = [
        f"{preferred_day} at 1:30 PM - 2:00 PM EST",
        f"{preferred_day} at 3:00 PM - 3:30 PM EST",
        f"{preferred_day} at 4:30 PM - 5:00 PM EST"
    ]
    return f"Available calendar slots for {duration_minutes} min meeting on {preferred_day}: " + ", ".join(available_slots)


@tool
def schedule_meeting(subject: str, attendees: List[str], preferred_day: str, duration_minutes: int = 30) -> str:
    """Schedule a calendar meeting invitation for given attendees and time."""
    return (
        f"Meeting '{subject}' tentatively scheduled for {preferred_day} "
        f"({duration_minutes} min) with attendees: {', '.join(attendees)}."
    )


def get_agent_tools():
    """Return list of tools available to the LangGraph response agent."""
    return [write_email, check_calendar_availability, schedule_meeting]


def get_tools_map():
    """Return dictionary mapping tool names to functions."""
    tools = get_agent_tools()
    return {t.name: t for t in tools}
