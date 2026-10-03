"""Preferences & Adaptive Memory API Endpoints with MongoDB persistence."""
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends
from backend.app.schemas import PreferencesPayload
from backend.app.auth.dependencies import get_optional_user
from backend.app.database.mongo import db
from backend.app.agent.memory import preference_store
from backend.app.agent.prompts import (
    DEFAULT_BACKGROUND,
    DEFAULT_TRIAGE_INSTRUCTIONS,
    DEFAULT_RESPONSE_PREFERENCES,
    DEFAULT_CAL_PREFERENCES,
)

router = APIRouter(prefix="/memory")


def resolve_user_id(user: Optional[dict]) -> str:
    return user.get("_id", user.get("id", "default_user")) if user else "default_user"


@router.get("")
async def get_preferences(current_user: Optional[dict] = Depends(get_optional_user)):
    """Retrieve all current user preferences, background context, and learned rules."""
    user_id = resolve_user_id(current_user)
    prefs = await db.get_preferences(user_id)
    # Sync memory singleton
    preference_store.update_profile(
        background=prefs.get("background", DEFAULT_BACKGROUND),
        triage_instructions=prefs.get("triage_instructions", DEFAULT_TRIAGE_INSTRUCTIONS),
        response_preferences=prefs.get("response_preferences", DEFAULT_RESPONSE_PREFERENCES),
        cal_preferences=prefs.get("cal_preferences", DEFAULT_CAL_PREFERENCES),
    )
    return {
        "background": prefs.get("background", DEFAULT_BACKGROUND),
        "triage_instructions": prefs.get("triage_instructions", DEFAULT_TRIAGE_INSTRUCTIONS),
        "response_preferences": prefs.get("response_preferences", DEFAULT_RESPONSE_PREFERENCES),
        "cal_preferences": prefs.get("cal_preferences", DEFAULT_CAL_PREFERENCES),
        "learned_preferences": prefs.get("learned_preferences", []),
    }


@router.post("")
async def update_preferences(payload: PreferencesPayload, current_user: Optional[dict] = Depends(get_optional_user)):
    """Directly update user preference rules and context."""
    user_id = resolve_user_id(current_user)
    update_data = {}
    if payload.background is not None:
        update_data["background"] = payload.background
    if payload.triage_instructions is not None:
        update_data["triage_instructions"] = payload.triage_instructions
    if payload.response_preferences is not None:
        update_data["response_preferences"] = payload.response_preferences
    if payload.cal_preferences is not None:
        update_data["cal_preferences"] = payload.cal_preferences

    updated = await db.update_preferences(user_id, **update_data)
    preference_store.update_profile(**update_data)
    return {
        "background": updated.get("background", DEFAULT_BACKGROUND),
        "triage_instructions": updated.get("triage_instructions", DEFAULT_TRIAGE_INSTRUCTIONS),
        "response_preferences": updated.get("response_preferences", DEFAULT_RESPONSE_PREFERENCES),
        "cal_preferences": updated.get("cal_preferences", DEFAULT_CAL_PREFERENCES),
        "learned_preferences": updated.get("learned_preferences", []),
    }


@router.post("/reset")
async def reset_preferences(current_user: Optional[dict] = Depends(get_optional_user)):
    """Reset all memory profiles and preferences to initial defaults."""
    user_id = resolve_user_id(current_user)
    updated = await db.update_preferences(
        user_id,
        background=DEFAULT_BACKGROUND,
        triage_instructions=DEFAULT_TRIAGE_INSTRUCTIONS,
        response_preferences=DEFAULT_RESPONSE_PREFERENCES,
        cal_preferences=DEFAULT_CAL_PREFERENCES,
        learned_preferences=[],
    )
    preference_store.update_profile(
        background=DEFAULT_BACKGROUND,
        triage_instructions=DEFAULT_TRIAGE_INSTRUCTIONS,
        response_preferences=DEFAULT_RESPONSE_PREFERENCES,
        cal_preferences=DEFAULT_CAL_PREFERENCES,
    )
    return {
        "background": DEFAULT_BACKGROUND,
        "triage_instructions": DEFAULT_TRIAGE_INSTRUCTIONS,
        "response_preferences": DEFAULT_RESPONSE_PREFERENCES,
        "cal_preferences": DEFAULT_CAL_PREFERENCES,
        "learned_preferences": [],
    }
