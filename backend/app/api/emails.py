"""Email management API endpoints with MongoDB persistence."""
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query, Depends
from backend.app.schemas import EmailItem, EmailCreate
from backend.app.auth.dependencies import get_optional_user
from backend.app.database.mongo import db

router = APIRouter(prefix="/emails")


def resolve_user_id(user: Optional[dict]) -> str:
    if user:
        return user.get("_id", user.get("id", "default_user"))
    return "default_user"


@router.get("", response_model=List[EmailItem])
async def list_emails(
    folder: Optional[str] = Query(None, description="Filter by folder: unread, respond, notify, ignore, drafted, sent"),
    search: Optional[str] = Query(None, description="Search query string"),
    account: Optional[str] = Query(None, description="Filter by account email or 'all'"),
    current_user: Optional[dict] = Depends(get_optional_user),
):
    """Retrieve emails list with optional folder, search, and account filtering."""
    user_id = resolve_user_id(current_user)
    
    filter_account = account
    if not filter_account and current_user:
        active_id = current_user.get("active_account_id")
        if active_id and active_id != "all":
            accounts = current_user.get("connected_accounts", [])
            matched = next((a for a in accounts if a.get("account_id") == active_id), None)
            if matched:
                filter_account = matched.get("email")

    emails = await db.list_emails(user_id=user_id, folder=folder, search_query=search, account_email=filter_account)
    if not emails and not folder and not search and not filter_account:
        await db.init_user_defaults(user_id)
        emails = await db.list_emails(user_id=user_id, folder=folder, search_query=search)
    return emails


@router.get("/stats/summary", response_model=Dict[str, int])
async def get_email_stats(current_user: Optional[dict] = Depends(get_optional_user)):
    """Get inbox statistics (counts for total, unread, respond, notify, ignore, sent, drafted)."""
    user_id = resolve_user_id(current_user)
    stats = await db.get_email_stats(user_id)
    if stats["total"] == 0:
        await db.init_user_defaults(user_id)
        stats = await db.get_email_stats(user_id)
    return stats


@router.post("/reset", response_model=Dict[str, Any])
async def reset_sample_dataset(current_user: Optional[dict] = Depends(get_optional_user)):
    """Reset the user's inbox back to the initial benchmark dataset."""
    user_id = resolve_user_id(current_user)
    await db.init_user_defaults(user_id)
    all_emails = await db.list_emails(user_id)
    return {"message": f"Inbox reset successfully with {len(all_emails)} sample emails", "count": len(all_emails)}


@router.get("/{email_id}", response_model=EmailItem)
async def get_email(email_id: str, current_user: Optional[dict] = Depends(get_optional_user)):
    """Retrieve a single email by its unique ID."""
    user_id = resolve_user_id(current_user)
    email = await db.get_email(email_id, user_id)
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    return email


@router.post("", response_model=EmailItem)
async def create_email(payload: EmailCreate, current_user: Optional[dict] = Depends(get_optional_user)):
    """Create and inject a new email into the inbox."""
    user_id = resolve_user_id(current_user)
    email_doc = {
        "user_id": user_id,
        "author": payload.author,
        "to": payload.to,
        "subject": payload.subject,
        "email_thread": payload.email_thread,
        "received_at": datetime.utcnow().isoformat(),
        "status": "unread",
        "confidence_score": 0.95,
        "feedback_history": [],
    }
    created = await db.create_email(email_doc)
    return created


@router.delete("/{email_id}")
async def delete_email(email_id: str, current_user: Optional[dict] = Depends(get_optional_user)):
    """Delete an email by ID."""
    user_id = resolve_user_id(current_user)
    email = await db.get_email(email_id, user_id)
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    await db.update_email(email_id, user_id, status="ignored")
    return {"message": "Email deleted successfully"}
