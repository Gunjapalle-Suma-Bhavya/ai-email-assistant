from typing import Dict, Any
from fastapi import APIRouter
from backend.app.schemas import PreferencesPayload
from backend.app.agent.memory import preference_store
from backend.app.agent.prompts import (
    DEFAULT_BACKGROUND,
    DEFAULT_TRIAGE_INSTRUCTIONS,
    DEFAULT_RESPONSE_PREFERENCES,
    DEFAULT_CAL_PREFERENCES,
)

router = APIRouter(prefix="/memory")


@router.get("", response_model=Dict[str, str])
def get_preferences():
    """Retrieve all current user preferences, background context, and triage rules."""
    return preference_store.get_all()


@router.post("", response_model=Dict[str, str])
def update_preferences(payload: PreferencesPayload):
    """Directly update user preference rules and context."""
    preference_store.update_profile(
        background=payload.background,
        triage_instructions=payload.triage_instructions,
        response_preferences=payload.response_preferences,
        cal_preferences=payload.cal_preferences,
    )
    return preference_store.get_all()


@router.post("/reset", response_model=Dict[str, str])
def reset_preferences():
    """Reset all memory profiles and preferences to initial defaults."""
    preference_store.update_profile(
        background=DEFAULT_BACKGROUND,
        triage_instructions=DEFAULT_TRIAGE_INSTRUCTIONS,
        response_preferences=DEFAULT_RESPONSE_PREFERENCES,
        cal_preferences=DEFAULT_CAL_PREFERENCES,
    )
    return preference_store.get_all()
