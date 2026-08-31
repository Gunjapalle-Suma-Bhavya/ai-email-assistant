from fastapi import APIRouter, HTTPException
from backend.app.schemas import (
    DraftRequest,
    DraftResponse,
    HITLActionRequest,
    HITLActionResponse,
)
from backend.app.services.email_service import email_service
from backend.app.services.calendar_service import calendar_service
from backend.app.agent.graph import assistant_engine, get_llm
from backend.app.agent.memory import preference_store

router = APIRouter(prefix="/hitl")


@router.post("/draft", response_model=DraftResponse)
def generate_draft(payload: DraftRequest):
    """Generate an AI response draft and/or calendar event for human review."""
    author = ""
    to = ""
    subject = ""
    email_thread = ""
    email_id = payload.email_id

    if email_id:
        email = email_service.get_email(email_id)
        if not email:
            raise HTTPException(status_code=404, detail="Email not found")
        author = email.author
        to = email.to
        subject = email.subject
        email_thread = email.email_thread
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
        email_service.update_email(
            email_id=email_id,
            draft_subject=result.subject,
            draft_response=result.body,
            calendar_event=result.calendar_event,
            status="drafted",
        )

    return result


@router.post("/action", response_model=HITLActionResponse)
def execute_hitl_action(payload: HITLActionRequest):
    """Human-in-the-Loop decision execution (Accept, Edit, Ignore, Feedback)."""
    email = email_service.get_email(payload.email_id)
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")

    action = payload.action
    memory_updated = False
    llm = get_llm()

    if action == "accept":
        # Accept the draft as-is and mark sent
        if payload.calendar_event:
            calendar_service.add_event(
                subject=payload.calendar_event.get("subject", email.subject),
                attendees=payload.calendar_event.get("attendees", [email.author]),
                preferred_day=payload.calendar_event.get("preferred_day", "Upcoming"),
                duration_minutes=payload.calendar_event.get("duration_minutes", 30),
                confirmed=True,
            )
        email_service.update_email(
            email_id=payload.email_id,
            status="sent",
        )
        return HITLActionResponse(
            success=True,
            message="Draft approved and response email sent successfully.",
            email_id=payload.email_id,
            status="sent",
            memory_updated=False,
        )

    elif action == "edit":
        # Human edited the draft before sending
        final_body = payload.edited_body or email.draft_response or ""
        final_subject = payload.edited_subject or email.draft_subject or email.subject

        if payload.calendar_event:
            calendar_service.add_event(
                subject=payload.calendar_event.get("subject", final_subject),
                attendees=payload.calendar_event.get("attendees", [email.author]),
                preferred_day=payload.calendar_event.get("preferred_day", "Upcoming"),
                duration_minutes=payload.calendar_event.get("duration_minutes", 30),
                confirmed=True,
            )

        email_service.update_email(
            email_id=payload.email_id,
            draft_subject=final_subject,
            draft_response=final_body,
            status="sent",
        )

        # Update memory profile with user's stylistic changes
        feedback_note = f"User edited draft for '{email.subject}'. Original draft: '{email.draft_response}'. Final edited response: '{final_body}'."
        memory_updated = preference_store.learn_from_feedback("response_preferences", feedback_note, llm_instance=llm)

        return HITLActionResponse(
            success=True,
            message="Edited draft sent and memory updated with your preference adjustments.",
            email_id=payload.email_id,
            status="sent",
            memory_updated=memory_updated,
        )

    elif action == "ignore":
        # Human decided to ignore this email
        email_service.update_email(
            email_id=payload.email_id,
            status="ignored",
            classification="ignore",
        )
        feedback_note = f"User explicitly chose to IGNORE email from '{email.author}' with subject '{email.subject}'."
        memory_updated = preference_store.learn_from_feedback("triage_preferences", feedback_note, llm_instance=llm)

        return HITLActionResponse(
            success=True,
            message="Email marked as ignored and triage preferences reinforced.",
            email_id=payload.email_id,
            status="ignored",
            memory_updated=memory_updated,
        )

    elif action == "feedback":
        # Human gave feedback for regeneration
        feedback_text = payload.user_feedback or "Improve tone and conciseness."
        memory_updated = preference_store.learn_from_feedback("response_preferences", feedback_text, llm_instance=llm)

        # Regenerate draft with new feedback
        new_draft = assistant_engine.generate_draft(
            author=email.author,
            to=email.to,
            subject=email.subject,
            email_thread=email.email_thread,
            custom_instructions=feedback_text,
        )

        email_service.update_email(
            email_id=payload.email_id,
            draft_subject=new_draft.subject,
            draft_response=new_draft.body,
            calendar_event=new_draft.calendar_event,
            status="drafted",
        )

        return HITLActionResponse(
            success=True,
            message="Draft regenerated with your feedback incorporated.",
            email_id=payload.email_id,
            status="drafted",
            memory_updated=memory_updated,
        )

    raise HTTPException(status_code=400, detail=f"Invalid action type: {action}")
