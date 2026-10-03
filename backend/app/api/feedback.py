"""Feedback and Learning API Endpoints."""
import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends
from backend.app.schemas import FeedbackItem
from backend.app.auth.dependencies import get_optional_user
from backend.app.database.mongo import db
from backend.app.agent.memory import preference_store
from backend.app.agent.graph import get_llm

router = APIRouter(prefix="/feedback")


@router.get("", response_model=List[FeedbackItem])
async def list_feedback(current_user: Optional[dict] = Depends(get_optional_user)):
    """Retrieve learning history and preference adjustments."""
    user_id = current_user.get("_id", current_user.get("id")) if current_user else "default_user"
    return await db.list_feedback(user_id)


@router.post("", response_model=Dict[str, Any])
async def submit_feedback(
    payload: Dict[str, Any],
    current_user: Optional[dict] = Depends(get_optional_user)
):
    """Submit explicit user feedback to train communication preferences."""
    user_id = current_user.get("_id", current_user.get("id")) if current_user else "default_user"
    feedback_text = payload.get("feedback_text", "").strip()
    category = payload.get("category", "response_preferences")

    llm = get_llm()
    updated = preference_store.learn_from_feedback(category, feedback_text, llm_instance=llm)

    doc = {
        "_id": f"fb_{uuid.uuid4().hex[:8]}",
        "user_id": user_id,
        "action_type": "feedback",
        "feedback_note": feedback_text,
        "learned_rule": feedback_text,
        "timestamp": datetime.utcnow().isoformat(),
    }
    await db.log_feedback(doc)
    await db.append_learned_preference(user_id, feedback_text, source="Direct feedback")

    return {"success": True, "message": "Feedback applied and preferences updated.", "memory_updated": updated}
