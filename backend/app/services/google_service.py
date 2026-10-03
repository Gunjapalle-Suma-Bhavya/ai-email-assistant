"""
Google OAuth 2.0, Gmail API, and Google Calendar API Service.
Provides authentication flow, message syncing, draft creation, sending, and calendar management.
"""
import os
import base64
import logging
from email.message import EmailMessage
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import urllib.parse
import httpx

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

from backend.app.config import settings

logger = logging.getLogger("service.google")

# Required OAuth 2.0 Scopes
GOOGLE_SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/calendar.events",
]


class GoogleService:
    def __init__(self):
        self.client_id = settings.GOOGLE_CLIENT_ID
        self.client_secret = settings.GOOGLE_CLIENT_SECRET
        self.redirect_uri = settings.GOOGLE_REDIRECT_URI

    def get_authorization_url(self, state: Optional[str] = None, redirect_uri: Optional[str] = None) -> str:
        """Generate Google OAuth 2.0 Consent URL with offline refresh token support."""
        r_uri = redirect_uri or self.redirect_uri
        params = {
            "client_id": self.client_id,
            "redirect_uri": r_uri,
            "response_type": "code",
            "scope": " ".join(GOOGLE_SCOPES),
            "access_type": "offline",
            "prompt": "consent",
        }
        if state:
            params["state"] = state
        return f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"

    async def exchange_code(self, code: str, redirect_uri: Optional[str] = None) -> Dict[str, Any]:
        """Exchange authorization code for access and refresh tokens, plus user profile info."""
        r_uri = redirect_uri or self.redirect_uri
        token_url = "https://oauth2.googleapis.com/token"
        payload = {
            "code": code,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "redirect_uri": r_uri,
            "grant_type": "authorization_code",
        }

        async with httpx.AsyncClient() as client:
            resp = await client.post(token_url, data=payload)
            if resp.status_code != 200:
                logger.error(f"Google token exchange failed: {resp.text}")
                raise ValueError(f"Failed to exchange Google authorization code: {resp.text}")
            token_data = resp.json()

            # Retrieve user profile
            userinfo_resp = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {token_data['access_token']}"},
            )
            if userinfo_resp.status_code != 200:
                raise ValueError("Failed to retrieve Google user profile")
            user_info = userinfo_resp.json()

        return {
            "tokens": token_data,
            "profile": user_info,
        }

    def get_credentials(self, user: Dict[str, Any]) -> Credentials:
        """Construct verified Google Credentials for a user, auto-refreshing if expired."""
        google_tokens = user.get("google_tokens", {})
        if not google_tokens:
            raise ValueError("User has not connected a Google account.")

        creds = Credentials(
            token=google_tokens.get("access_token"),
            refresh_token=google_tokens.get("refresh_token"),
            token_uri="https://oauth2.googleapis.com/token",
            client_id=self.client_id,
            client_secret=self.client_secret,
            scopes=GOOGLE_SCOPES,
        )

        # Refresh if expired
        if creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception as e:
                logger.warning(f"Could not refresh Google credentials: {e}")

        return creds

    # ---------------- GMAIL API OPERATIONS ----------------
    def fetch_gmail_messages(self, user: Dict[str, Any], max_results: int = 50) -> List[Dict[str, Any]]:
        """Fetch incoming emails directly from the user's live Gmail inbox with accurate ISO timestamps."""
        creds = self.get_credentials(user)
        service = build("gmail", "v1", credentials=creds)

        # Fetch recent inbox message IDs (increase limit up to 50 to get all recent emails)
        results = service.users().messages().list(
            userId="me",
            q="in:inbox",
            maxResults=max(max_results, 50),
        ).execute()

        messages = results.get("messages", [])
        synced_emails = []

        for msg_item in messages:
            msg_id = msg_item["id"]
            try:
                msg = service.users().messages().get(
                    userId="me",
                    id=msg_id,
                    format="full",
                ).execute()

                headers = {h["name"].lower(): h["value"] for h in msg.get("payload", {}).get("headers", [])}
                subject = headers.get("subject", "No Subject")
                author = headers.get("from", "Unknown Sender")
                to_addr = headers.get("to", user.get("email", "me"))

                # Accurate ISO 8601 timestamp from Gmail internalDate (milliseconds epoch)
                internal_ms = msg.get("internalDate")
                if internal_ms:
                    try:
                        date_iso = datetime.utcfromtimestamp(int(internal_ms) / 1000.0).isoformat() + "Z"
                    except Exception:
                        date_iso = datetime.utcnow().isoformat() + "Z"
                else:
                    date_iso = datetime.utcnow().isoformat() + "Z"

                # Parse email body content
                body_content = ""
                payload = msg.get("payload", {})
                if "parts" in payload:
                    for part in payload["parts"]:
                        if part.get("mimeType") == "text/plain" and "data" in part.get("body", {}):
                            data = part["body"]["data"]
                            body_content = base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")
                            break
                        elif part.get("mimeType") == "text/html" and "data" in part.get("body", {}):
                            data = part["body"]["data"]
                            body_content = base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")

                if not body_content and "body" in payload and "data" in payload["body"]:
                    data = payload["body"]["data"]
                    body_content = base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")

                if not body_content:
                    body_content = msg.get("snippet", "")

                synced_emails.append({
                    "google_id": msg_id,
                    "thread_id": msg.get("threadId", msg_id),
                    "author": author,
                    "to": to_addr,
                    "subject": subject,
                    "email_thread": body_content,
                    "received_at": date_iso,
                    "status": "unread" if "UNREAD" in msg.get("labelIds", []) else "read",
                    "source": "gmail",
                })
            except Exception as e:
                logger.error(f"Error reading message {msg_id}: {e}")

        # Chronological sort: newest first
        synced_emails.sort(key=lambda x: x.get("received_at", ""), reverse=True)
        return synced_emails

    def create_gmail_draft(self, user: Dict[str, Any], to: str, subject: str, body: str) -> Dict[str, Any]:
        """Create a real draft in the user's Gmail account."""
        creds = self.get_credentials(user)
        service = build("gmail", "v1", credentials=creds)

        message = EmailMessage()
        message.set_content(body)
        message["To"] = to
        message["From"] = user.get("email", "me")
        message["Subject"] = subject

        encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        create_draft_body = {"message": {"raw": encoded_message}}

        draft = service.users().drafts().create(userId="me", body=create_draft_body).execute()
        return draft

    def send_gmail_message(self, user: Dict[str, Any], to: str, subject: str, body: str) -> Dict[str, Any]:
        """Dispatch a real email from the user's Gmail account."""
        creds = self.get_credentials(user)
        service = build("gmail", "v1", credentials=creds)

        message = EmailMessage()
        message.set_content(body)
        message["To"] = to
        message["From"] = user.get("email", "me")
        message["Subject"] = subject

        encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        send_body = {"raw": encoded_message}

        sent = service.users().messages().send(userId="me", body=send_body).execute()
        return sent

    # ---------------- GOOGLE CALENDAR API OPERATIONS ----------------
    def fetch_calendar_events(self, user: Dict[str, Any], max_results: int = 15) -> List[Dict[str, Any]]:
        """Fetch upcoming events from the user's primary Google Calendar."""
        creds = self.get_credentials(user)
        service = build("calendar", "v3", credentials=creds)

        now = datetime.utcnow().isoformat() + "Z"
        events_result = service.events().list(
            calendarId="primary",
            timeMin=now,
            maxResults=max_results,
            singleEvents=True,
            orderBy="startTime",
        ).execute()

        events = events_result.get("items", [])
        formatted = []
        for evt in events:
            start = evt.get("start", {}).get("dateTime", evt.get("start", {}).get("date"))
            formatted.append({
                "google_event_id": evt.get("id"),
                "subject": evt.get("summary", "Untitled Meeting"),
                "preferred_day": start,
                "duration_minutes": 30,
                "confirmed": True,
                "hangout_link": evt.get("hangoutLink"),
                "attendees": [a.get("email") for a in evt.get("attendees", []) if a.get("email")],
            })
        return formatted

    def create_calendar_event(
        self,
        user: Dict[str, Any],
        subject: str,
        start_time_iso: Optional[str] = None,
        duration_minutes: int = 30,
        attendees: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Schedule a meeting on Google Calendar with auto-generated Google Meet video conference link."""
        creds = self.get_credentials(user)
        service = build("calendar", "v3", credentials=creds)

        if not start_time_iso:
            start_dt = datetime.utcnow() + timedelta(days=1)
        else:
            try:
                start_dt = datetime.fromisoformat(start_time_iso.replace("Z", "+00:00"))
            except Exception:
                start_dt = datetime.utcnow() + timedelta(days=1)

        end_dt = start_dt + timedelta(minutes=duration_minutes)

        event_body = {
            "summary": subject,
            "description": "Scheduled by AetherMail Executive AI Assistant",
            "start": {"dateTime": start_dt.isoformat()},
            "end": {"dateTime": end_dt.isoformat()},
            "attendees": [{"email": a} for a in (attendees or [])],
            "conferenceData": {
                "createRequest": {
                    "requestId": f"meet_{int(datetime.utcnow().timestamp())}",
                    "conferenceSolutionKey": {"type": "hangoutsMeet"},
                }
            },
        }

        created = service.events().insert(
            calendarId="primary",
            body=event_body,
            conferenceDataVersion=1,
        ).execute()

        return {
            "id": created.get("id"),
            "subject": created.get("summary"),
            "preferred_day": start_dt.strftime("%A, %B %d, %Y at %I:%M %p"),
            "duration_minutes": duration_minutes,
            "confirmed": True,
            "hangout_link": created.get("hangoutLink"),
        }

    def watch_mailbox(self, user: Dict[str, Any], topic_name: str) -> Dict[str, Any]:
        """
        Register a push notification watch on the user's Gmail mailbox via Google Cloud Pub/Sub.
        Google publishes incoming message updates to the specified topicName.
        """
        service = self._get_gmail_service(user)
        request_body = {
            "topicName": topic_name,
            "labelIds": ["INBOX"],
        }
        res = service.users().watch(userId="me", body=request_body).execute()
        logger.info(f"Gmail push watch registered: historyId={res.get('historyId')}, expiration={res.get('expiration')}")
        return res

    def stop_watch_mailbox(self, user: Dict[str, Any]) -> None:
        """Stop push notification watch on the user's Gmail mailbox."""
        service = self._get_gmail_service(user)
        service.users().stop(userId="me").execute()
        logger.info("Gmail push watch terminated.")

    @staticmethod
    def infer_account_type(email: str, profile: Optional[Dict[str, Any]] = None) -> str:
        """Infer whether a Google account is 'workspace' (corporate) or 'personal'."""
        if profile and profile.get("hd"):
            return "workspace"
        norm = email.lower().strip()
        if not norm.endswith("@gmail.com") and not norm.endswith("@googlemail.com"):
            return "workspace"
        return "personal"


google_service = GoogleService()
