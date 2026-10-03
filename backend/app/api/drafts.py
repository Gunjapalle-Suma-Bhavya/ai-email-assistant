"""Dedicated Drafts API Endpoints."""
import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from backend.app.schemas import (
    DraftItem,
    DraftRequest,
    DraftResponse,
    HITLActionRequest,
    HITLActionResponse,
)
from backend.app.auth.dependencies import get_current_user, get_optional_user
from backend.app.database.mongo import db
from backend.app.agent.graph import assistant_engine, get_llm
from backend.app.agent.memory import preference_store

router = APIRouter(prefix="/drafts")


@router.get("", response_model=List[DraftItem])
async def list_drafts(current_user: Optional[dict] = Depends(get_optional_user)):
    """List all AI-generated drafts for the active user."""
    user_id = current_user.get("_id", current_user.get("id")) if current_user else "default_user"
    drafts = await db.list_drafts(user_id)
    # Also check if any emails have drafts not yet saved in drafts collection
    if not drafts:
        emails = await db.list_emails(user_id, folder="drafted")
        for em in emails:
            if em.get("draft_response"):
                drafts.append({
                    "id": f"drf_{em['id']}",
                    "email_id": em["id"],
                    "subject": em.get("draft_subject") or f"Re: {em['subject']}",
                    "to": em["author"],
                    "body": em["draft_response"],
                    "tool_name": "write_email",
                    "calendar_event": em.get("calendar_event"),
                    "status": "pending_review",
                    "created_at": em.get("received_at"),
                    "updated_at": em.get("received_at"),
                })
    return drafts


@router.post("/generate", response_model=DraftResponse)
async def generate_draft_endpoint(
    payload: DraftRequest,
    current_user: Optional[dict] = Depends(get_optional_user)
):
    """Generate an AI draft reply and optional calendar slot."""
    user_id = current_user.get("_id", current_user.get("id")) if current_user else "default_user"
    email_id = payload.email_id

    author, to, subject, email_thread = "", "", "", ""
    if email_id:
        email = await db.get_email(email_id, user_id)
        if not email:
            raise HTTPException(status_code=404, detail="Email not found")
        author = email["author"]
        to = email["to"]
        subject = email["subject"]
        email_thread = email["email_thread"]
    elif payload.email_data:
        author = payload.email_data.author
        to = payload.email_data.to
        subject = payload.email_data.subject
        email_thread = payload.email_data.email_thread
    else:
        raise HTTPException(status_code=400, detail="Either email_id or email_data required")

    result = assistant_engine.generate_draft(
        author=author,
        to=to,
        subject=subject,
        email_thread=email_thread,
        custom_instructions=payload.custom_instructions,
    )
    result.email_id = email_id

    # Persist draft to MongoDB
    draft_id = f"drf_{email_id}" if email_id else f"drf_{uuid.uuid4().hex[:8]}"
    draft_doc = {
        "_id": draft_id,
        "user_id": user_id,
        "email_id": email_id or "",
        "subject": result.subject,
        "to": result.to,
        "body": result.body,
        "tool_name": result.tool_name,
        "calendar_event": result.calendar_event,
        "status": "pending_review",
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    await db.save_draft(draft_doc)

    if email_id:
        await db.update_email(
            email_id=email_id,
            user_id=user_id,
            draft_subject=result.subject,
            draft_response=result.body,
            calendar_event=result.calendar_event,
            status="drafted",
        )

    return result
