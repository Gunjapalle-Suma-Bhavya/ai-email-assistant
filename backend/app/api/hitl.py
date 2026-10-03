import re
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from backend.app.schemas import (
    DraftRequest,
    DraftResponse,
    HITLActionRequest,
    HITLActionResponse,
)
from backend.app.auth.dependencies import get_optional_user
from backend.app.database.mongo import db
from backend.app.agent.graph import assistant_engine, get_llm
from backend.app.agent.memory import preference_store
from backend.app.services.google_service import google_service

logger = logging.getLogger("api.hitl")

router = APIRouter(prefix="/hitl")


def resolve_user_id(user: Optional[dict]) -> str:
    return user.get("_id", user.get("id", "default_user")) if user else "default_user"


@router.post("/draft", response_model=DraftResponse)
async def generate_draft(payload: DraftRequest, current_user: Optional[dict] = Depends(get_optional_user)):
    """Generate an AI response draft and/or calendar event for human review."""
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

    result = assistant_engine.generate_draft(
        author=author,
        to=to,
        subject=subject,
        email_thread=email_thread,
        custom_instructions=payload.custom_instructions,
    )
    result.email_id = email_id

    if email_id:
        await db.update_email(
            email_id=email_id,
            user_id=user_id,
            draft_subject=result.subject,
            draft_response=result.body,
            calendar_event=result.calendar_event,
            status="drafted",
        )
        # Also upsert into drafts collection
        draft_doc = {
            "_id": f"drf_{email_id}",
            "user_id": user_id,
            "email_id": email_id,
            "subject": result.subject,
            "to": result.to,
            "body": result.body,
            "tool_name": result.tool_name,
            "calendar_event": result.calendar_event,
            "status": "pending_review",
        }
        await db.save_draft(draft_doc)

    return result


@router.post("/action", response_model=HITLActionResponse)
async def execute_hitl_action(payload: HITLActionRequest, current_user: Optional[dict] = Depends(get_optional_user)):
    """Human-in-the-Loop decision execution (Accept, Edit, Ignore, Feedback)."""
    user_id = resolve_user_id(current_user)
    email = await db.get_email(payload.email_id, user_id)
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")

    action = payload.action
    memory_updated = False
    llm = get_llm()

    user_doc = await db.get_user_by_id(user_id) if hasattr(db, "get_user_by_id") else None
    if not user_doc and current_user:
        user_doc = current_user

    def extract_clean_email(author_str: str) -> str:
        match = re.search(r'<([^>]+)>', author_str)
        return match.group(1).strip() if match else author_str.strip()

    if action == "accept":
        sent_subject = email.get("draft_subject") or f"Re: {email['subject']}"
        sent_body = email.get("draft_response") or ""
        recipient = extract_clean_email(email.get("author", ""))

        # Dispatch real email via Gmail API if user has connected Google account
        if user_doc and user_doc.get("google_tokens"):
            try:
                google_service.send_gmail_message(
                    user=user_doc,
                    to=recipient,
                    subject=sent_subject,
                    body=sent_body,
                )
                logger.info(f"Dispatched live Gmail message to {recipient}")
            except Exception as send_err:
                logger.error(f"Gmail live send error: {send_err}")

        # Schedule real event on Google Calendar if event present
        if payload.calendar_event:
            cal_evt = payload.calendar_event
            hangout_link = None
            if user_doc and user_doc.get("google_tokens"):
                try:
                    cal_res = google_service.create_calendar_event(
                        user=user_doc,
                        subject=cal_evt.get("subject", email["subject"]),
                        attendees=[recipient],
                        duration_minutes=cal_evt.get("duration_minutes", 30),
                    )
                    hangout_link = cal_res.get("hangoutLink")
                    logger.info(f"Scheduled Google Calendar event with Meet link: {hangout_link}")
                except Exception as cal_err:
                    logger.error(f"Google Calendar create error: {cal_err}")

            await db.add_calendar_event({
                "user_id": user_id,
                "subject": cal_evt.get("subject", email["subject"]),
                "attendees": cal_evt.get("attendees", [email["author"]]),
                "preferred_day": cal_evt.get("preferred_day", "Upcoming"),
                "duration_minutes": cal_evt.get("duration_minutes", 30),
                "confirmed": True,
                "hangout_link": hangout_link,
                "source_email_id": payload.email_id,
            })

        await db.update_email(
            email_id=payload.email_id,
            user_id=user_id,
            status="sent",
        )
        return HITLActionResponse(
            success=True,
            message="Draft approved and live email response dispatched.",
            email_id=payload.email_id,
            status="sent",
            memory_updated=False,
        )

    elif action == "edit":
        final_body = payload.edited_body or email.get("draft_response") or ""
        final_subject = payload.edited_subject or email.get("draft_subject") or email["subject"]
        recipient = extract_clean_email(email.get("author", ""))

        # Dispatch real edited email via Gmail API if user has connected Google account
        if user_doc and user_doc.get("google_tokens"):
            try:
                google_service.send_gmail_message(
                    user=user_doc,
                    to=recipient,
                    subject=final_subject,
                    body=final_body,
                )
                logger.info(f"Dispatched edited live Gmail message to {recipient}")
            except Exception as send_err:
                logger.error(f"Gmail live send error: {send_err}")

        # Schedule real event on Google Calendar if event present
        if payload.calendar_event:
            cal_evt = payload.calendar_event
            hangout_link = None
            if user_doc and user_doc.get("google_tokens"):
                try:
                    cal_res = google_service.create_calendar_event(
                        user=user_doc,
                        subject=cal_evt.get("subject", final_subject),
                        attendees=[recipient],
                        duration_minutes=cal_evt.get("duration_minutes", 30),
                    )
                    hangout_link = cal_res.get("hangoutLink")
                    logger.info(f"Scheduled Google Calendar event with Meet link: {hangout_link}")
                except Exception as cal_err:
                    logger.error(f"Google Calendar create error: {cal_err}")

            await db.add_calendar_event({
                "user_id": user_id,
                "subject": cal_evt.get("subject", final_subject),
                "attendees": cal_evt.get("attendees", [email["author"]]),
                "preferred_day": cal_evt.get("preferred_day", "Upcoming"),
                "duration_minutes": cal_evt.get("duration_minutes", 30),
                "confirmed": True,
                "hangout_link": hangout_link,
                "source_email_id": payload.email_id,
            })

        await db.update_email(
            email_id=payload.email_id,
            user_id=user_id,
            draft_subject=final_subject,
            draft_response=final_body,
            status="sent",
        )

        feedback_note = f"User edited draft for '{email['subject']}'. Final edited tone: '{final_body[:120]}...'"
        memory_updated = preference_store.learn_from_feedback("response_preferences", feedback_note, llm_instance=llm)
        await db.append_learned_preference(user_id, f"Style preference from edit: {feedback_note}", source="HITL Edit")
        await db.log_feedback({
            "user_id": user_id,
            "action_type": "edit",
            "email_id": payload.email_id,
            "original_text": email.get("draft_response"),
            "edited_text": final_body,
            "feedback_note": feedback_note,
        })

        return HITLActionResponse(
            success=True,
            message="Edited draft dispatched and memory updated with your preference adjustments.",
            email_id=payload.email_id,
            status="sent",
            memory_updated=memory_updated,
        )

    elif action == "ignore":
        await db.update_email(
            email_id=payload.email_id,
            user_id=user_id,
            status="ignored",
            classification="ignore",
        )
        feedback_note = f"User explicitly chose to IGNORE email from '{email['author']}' with subject '{email['subject']}'."
        memory_updated = preference_store.learn_from_feedback("triage_preferences", feedback_note, llm_instance=llm)
        await db.append_learned_preference(user_id, feedback_note, source="HITL Ignore Override")
        await db.log_feedback({
            "user_id": user_id,
            "action_type": "ignore",
            "email_id": payload.email_id,
            "feedback_note": feedback_note,
        })

        return HITLActionResponse(
            success=True,
            message="Email marked as ignored and triage preferences reinforced.",
            email_id=payload.email_id,
            status="ignored",
            memory_updated=memory_updated,
        )

    elif action == "feedback":
        feedback_text = payload.user_feedback or "Improve tone and conciseness."
        memory_updated = preference_store.learn_from_feedback("response_preferences", feedback_text, llm_instance=llm)
        await db.append_learned_preference(user_id, feedback_text, source="HITL Regeneration Guidance")

        new_draft = assistant_engine.generate_draft(
            author=email["author"],
            to=email["to"],
            subject=email["subject"],
            email_thread=email["email_thread"],
            custom_instructions=feedback_text,
        )

        await db.update_email(
            email_id=payload.email_id,
            user_id=user_id,
            draft_subject=new_draft.subject,
            draft_response=new_draft.body,
            calendar_event=new_draft.calendar_event,
            status="drafted",
        )
        await db.log_feedback({
            "user_id": user_id,
            "action_type": "feedback",
            "email_id": payload.email_id,
            "feedback_note": feedback_text,
        })

        return HITLActionResponse(
            success=True,
            message="Draft regenerated with your feedback incorporated.",
            email_id=payload.email_id,
            status="drafted",
            memory_updated=memory_updated,
        )

    raise HTTPException(status_code=400, detail=f"Invalid action type: {action}")
