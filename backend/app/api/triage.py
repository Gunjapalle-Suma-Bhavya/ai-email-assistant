from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from backend.app.schemas import TriageRequest, TriageResponse
from backend.app.services.email_service import email_service
from backend.app.agent.graph import assistant_engine

router = APIRouter(prefix="/triage")


@router.post("", response_model=TriageResponse)
def triage_email(payload: TriageRequest):
    """Triage an email to determine whether to respond, notify, or ignore."""
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

    result = assistant_engine.triage(
        author=author,
        to=to,
        subject=subject,
        email_thread=email_thread,
    )
    result.email_id = email_id

    # If associated with stored email, update record
    if email_id:
        email_service.update_email(
            email_id=email_id,
            classification=result.classification,
            reasoning=result.reasoning,
            status="triaged",
        )

    return result


@router.post("/all", response_model=List[TriageResponse])
def triage_all_unread():
    """Batch triage all unread emails in the inbox."""
    unread_emails = email_service.list_emails(folder="unread")
    results = []

    for email in unread_emails:
        res = assistant_engine.triage(
            author=email.author,
            to=email.to,
            subject=email.subject,
            email_thread=email.email_thread,
        )
        res.email_id = email.id
        email_service.update_email(
            email_id=email.id,
            classification=res.classification,
            reasoning=res.reasoning,
            status="triaged",
        )
        results.append(res)

    return results
