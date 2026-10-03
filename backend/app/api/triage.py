"""Triage API endpoints connecting AI Assistant to MongoDB."""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends
from backend.app.schemas import TriageRequest, TriageResponse
from backend.app.auth.dependencies import get_optional_user
from backend.app.database.mongo import db
from backend.app.agent.graph import assistant_engine

router = APIRouter(prefix="/triage")


def resolve_user_id(user: Optional[dict]) -> str:
    return user.get("_id", user.get("id", "default_user")) if user else "default_user"


@router.post("", response_model=TriageResponse)
async def triage_email(payload: TriageRequest, current_user: Optional[dict] = Depends(get_optional_user)):
    """Triage an email to determine whether to respond, notify, or ignore."""
    user_id = resolve_user_id(current_user)
    author = ""
    to = ""
    subject = ""
    email_thread = ""
    email_id = payload.email_id

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
        raise HTTPException(status_code=400, detail="Either email_id or email_data must be provided")

    result = assistant_engine.triage(
        author=author,
        to=to,
        subject=subject,
        email_thread=email_thread,
    )
    result.email_id = email_id

    # If associated with stored email, update record
    if email_id:
        status = "triaged"
        draft_subject = None
        draft_response = None
        cal_event = None

        if result.classification == "respond":
            try:
                draft_res = assistant_engine.generate_draft(
                    author=author,
                    to=to,
                    subject=subject,
                    email_thread=email_thread,
                )
                draft_subject = draft_res.subject
                draft_response = draft_res.body
                cal_event = draft_res.calendar_event
                status = "drafted"

                await db.save_draft({
                    "_id": f"drf_{email_id}",
                    "user_id": user_id,
                    "email_id": email_id,
                    "subject": draft_subject,
                    "to": author,
                    "body": draft_response,
                    "tool_name": "write_email",
                    "calendar_event": cal_event,
                    "status": "pending_review",
                })
            except Exception:
                pass

        await db.update_email(
            email_id=email_id,
            user_id=user_id,
            classification=result.classification,
            reasoning=result.reasoning,
            confidence_score=0.95,
            status=status,
            draft_subject=draft_subject,
            draft_response=draft_response,
            calendar_event=cal_event,
        )

    return result


@router.post("/all", response_model=List[TriageResponse])
async def triage_all_unread(current_user: Optional[dict] = Depends(get_optional_user)):
    """Batch triage all unread emails in the inbox."""
    user_id = resolve_user_id(current_user)
    unread_emails = await db.list_emails(user_id=user_id, folder="unread")
    results = []

    for email in unread_emails:
        res = assistant_engine.triage(
            author=email["author"],
            to=email["to"],
            subject=email["subject"],
            email_thread=email["email_thread"],
        )
        res.email_id = email["id"]

        status = "triaged"
        draft_subject = None
        draft_response = None
        cal_event = None

        if res.classification == "respond":
            try:
                d_res = assistant_engine.generate_draft(
                    author=email["author"],
                    to=email["to"],
                    subject=email["subject"],
                    email_thread=email["email_thread"],
                )
                draft_subject = d_res.subject
                draft_response = d_res.body
                cal_event = d_res.calendar_event
                status = "drafted"

                await db.save_draft({
                    "_id": f"drf_{email['id']}",
                    "user_id": user_id,
                    "email_id": email["id"],
                    "subject": draft_subject,
                    "to": email["author"],
                    "body": draft_response,
                    "tool_name": "write_email",
                    "calendar_event": cal_event,
                    "status": "pending_review",
                })
            except Exception:
                pass

        await db.update_email(
            email_id=email["id"],
            user_id=user_id,
            classification=res.classification,
            reasoning=res.reasoning,
            confidence_score=0.95,
            status=status,
            draft_subject=draft_subject,
            draft_response=draft_response,
            calendar_event=cal_event,
        )
        results.append(res)

    return results
