import json
import uuid
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from backend.app.config import settings
from backend.app.schemas import EmailItem, EmailCreate

logger = logging.getLogger(__name__)


class EmailService:
    """Manages email inbox state, sample datasets, and email updates."""

    def __init__(self):
        self._emails: Dict[str, EmailItem] = {}
        self.load_sample_dataset()

    def load_sample_dataset(self) -> int:
        """Load sample emails from data/sample_emails.json."""
        self._emails.clear()
        if settings.SAMPLE_EMAILS_PATH.exists():
            try:
                with open(settings.SAMPLE_EMAILS_PATH, "r", encoding="utf-8") as f:
                    raw_data = json.load(f)
                    for item in raw_data:
                        email_obj = EmailItem(
                            id=item["id"],
                            author=item["author"],
                            to=item["to"],
                            subject=item["subject"],
                            email_thread=item["email_thread"],
                            received_at=item.get("received_at", datetime.now().isoformat()),
                            status=item.get("status", "unread"),
                            classification=item.get("classification"),
                            reasoning=item.get("reasoning"),
                            draft_response=item.get("draft_response"),
                            draft_subject=item.get("draft_subject"),
                            calendar_event=item.get("calendar_event"),
                        )
                        self._emails[email_obj.id] = email_obj
                logger.info(f"Loaded {len(self._emails)} sample emails.")
            except Exception as e:
                logger.error(f"Failed to load sample emails: {e}")
        return len(self._emails)

    def list_emails(
        self,
        folder: Optional[str] = None,
        search_query: Optional[str] = None,
    ) -> List[EmailItem]:
        """List emails filtered by folder status or classification."""
        items = list(self._emails.values())

        if folder:
            if folder == "respond":
                items = [e for e in items if e.classification == "respond" and e.status != "sent"]
            elif folder == "notify":
                items = [e for e in items if e.classification == "notify"]
            elif folder == "ignore":
                items = [e for e in items if e.classification == "ignore" or e.status == "ignored"]
            elif folder == "drafted":
                items = [e for e in items if e.status == "drafted"]
            elif folder == "sent":
                items = [e for e in items if e.status == "sent"]
            elif folder == "unread":
                items = [e for e in items if e.status == "unread"]

        if search_query:
            q = search_query.lower()
            items = [
                e for e in items
                if q in e.subject.lower() or q in e.author.lower() or q in e.email_thread.lower()
            ]

        # Sort newest first
        return sorted(items, key=lambda x: x.received_at or "", reverse=True)

    def get_email(self, email_id: str) -> Optional[EmailItem]:
        return self._emails.get(email_id)

    def create_email(self, data: EmailCreate) -> EmailItem:
        email_id = f"email_{uuid.uuid4().hex[:8]}"
        email_obj = EmailItem(
            id=email_id,
            author=data.author,
            to=data.to,
            subject=data.subject,
            email_thread=data.email_thread,
            received_at=datetime.now().isoformat(),
            status="unread",
        )
        self._emails[email_id] = email_obj
        return email_obj

    def update_email(self, email_id: str, **kwargs) -> Optional[EmailItem]:
        email = self._emails.get(email_id)
        if not email:
            return None
        updated_dict = email.model_dump()
        for k, v in kwargs.items():
            if v is not None and k in updated_dict:
                updated_dict[k] = v
        updated_email = EmailItem(**updated_dict)
        self._emails[email_id] = updated_email
        return updated_email

    def delete_email(self, email_id: str) -> bool:
        if email_id in self._emails:
            del self._emails[email_id]
            return True
        return False

    def get_stats(self) -> Dict[str, int]:
        total = len(self._emails)
        unread = sum(1 for e in self._emails.values() if e.status == "unread")
        respond = sum(1 for e in self._emails.values() if e.classification == "respond")
        notify = sum(1 for e in self._emails.values() if e.classification == "notify")
        ignore = sum(1 for e in self._emails.values() if e.classification == "ignore")
        sent = sum(1 for e in self._emails.values() if e.status == "sent")
        drafted = sum(1 for e in self._emails.values() if e.status == "drafted")
        return {
            "total": total,
            "unread": unread,
            "respond": respond,
            "notify": notify,
            "ignore": ignore,
            "sent": sent,
            "drafted": drafted,
        }


email_service = EmailService()
