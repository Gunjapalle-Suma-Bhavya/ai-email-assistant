from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from backend.app.schemas import EmailItem, EmailCreate
from backend.app.services.email_service import email_service

router = APIRouter(prefix="/emails")


@router.get("", response_model=List[EmailItem])
def list_emails(
    folder: Optional[str] = Query(None, description="Filter by folder: unread, respond, notify, ignore, drafted, sent"),
    search: Optional[str] = Query(None, description="Search query string"),
):
    """Retrieve emails list with optional folder and search filtering."""
    return email_service.list_emails(folder=folder, search_query=search)


@router.get("/stats/summary", response_model=Dict[str, int])
def get_email_stats():
    """Get inbox statistics (counts for total, unread, respond, notify, ignore, sent, drafted)."""
    return email_service.get_stats()


@router.post("/reset", response_model=Dict[str, Any])
def reset_sample_dataset():
    """Reset the inbox back to the initial benchmark dataset."""
    count = email_service.load_sample_dataset()
    return {"message": f"Inbox reset successfully with {count} sample emails", "count": count}


@router.get("/{email_id}", response_model=EmailItem)
def get_email(email_id: str):
    """Retrieve a single email by its unique ID."""
    email = email_service.get_email(email_id)
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    return email


@router.post("", response_model=EmailItem)
def create_email(payload: EmailCreate):
    """Create and inject a new email into the inbox."""
    return email_service.create_email(payload)


@router.delete("/{email_id}")
def delete_email(email_id: str):
    """Delete an email by ID."""
    success = email_service.delete_email(email_id)
    if not success:
        raise HTTPException(status_code=404, detail="Email not found")
    return {"message": "Email deleted successfully"}
