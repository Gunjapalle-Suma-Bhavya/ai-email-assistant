"""
Google OAuth 2.0 and Gmail/Calendar Synchronization Endpoints.
"""
import uuid
import urllib.parse
import logging
from typing import Dict, Any, Optional
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse

from backend.app.config import settings
from backend.app.database.mongo import db_manager
from backend.app.services.google_service import google_service
from backend.app.auth.security import create_access_token
from backend.app.auth.dependencies import get_current_user
from backend.app.agent.graph import assistant_engine

logger = logging.getLogger("api.google_auth")

router = APIRouter(prefix="/auth/google", tags=["Google Authentication"])
sync_router = APIRouter(tags=["Google Sync"])


accounts_router = APIRouter(prefix="/accounts", tags=["Account Switcher"])


async def process_and_store_gmail_message(
    user_id: str,
    msg: Dict[str, Any],
    account_email: Optional[str] = None,
) -> Dict[str, Any]:
    """Execute AI Triage and Context-Aware Draft Generation on incoming Gmail message."""
    author = msg.get("author", "")
    to_addr = msg.get("to", "")
    subject = msg.get("subject", "")
    thread_body = msg.get("email_thread", "")
    acc_email = account_email or msg.get("account_email") or to_addr

    # 1. Run AI Triage (Classify into respond, notify, ignore with structured reasoning)
    triage_res = assistant_engine.triage(
        author=author,
        to=to_addr,
        subject=subject,
        email_thread=thread_body,
    )

    draft_subject = None
    draft_response = None
    cal_event = None
    status = "unread"

    # 2. If requires response, run context-aware draft & calendar detection
    if triage_res.classification == "respond":
        try:
            draft_res = assistant_engine.generate_draft(
                author=author,
                to=to_addr,
                subject=subject,
                email_thread=thread_body,
            )
            draft_subject = draft_res.subject
            draft_response = draft_res.body
            cal_event = draft_res.calendar_event
            status = "drafted"
        except Exception as draft_err:
            logger.warning(f"Draft generation during sync: {draft_err}")
    elif triage_res.classification == "ignore":
        status = "ignored"
    elif triage_res.classification == "notify":
        status = "read"

    google_id = msg.get("google_id")
    doc = {
        "_id": f"em_gmail_{google_id}" if google_id else None,
        "user_id": user_id,
        "account_email": acc_email,
        "author": author,
        "to": to_addr,
        "subject": subject,
        "email_thread": thread_body,
        "received_at": msg.get("received_at", datetime.utcnow().isoformat()),
        "status": status,
        "classification": triage_res.classification,
        "reasoning": triage_res.reasoning,
        "confidence_score": 0.95,
        "draft_subject": draft_subject,
        "draft_response": draft_response,
        "calendar_event": cal_event,
        "source": "gmail",
        "google_id": msg.get("google_id"),
        "thread_id": msg.get("thread_id"),
    }
    created = await db_manager.create_email(doc)

    if status == "drafted" and draft_response:
        await db_manager.save_draft({
            "_id": f"drf_{created['_id']}",
            "user_id": user_id,
            "email_id": created["_id"],
            "subject": draft_subject,
            "to": author,
            "body": draft_response,
            "tool_name": "write_email",
            "calendar_event": cal_event,
            "status": "pending_review",
        })

    return created


@router.get("/login")
def google_login(redirect_uri: Optional[str] = None):
    """
    Redirect the browser to Google's OAuth 2.0 consent page.
    Requests permissions for Identity, Gmail, and Google Calendar.
    """
    try:
        auth_url = google_service.get_authorization_url(redirect_uri=redirect_uri)
        return RedirectResponse(url=auth_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)
    except Exception as e:
        logger.error(f"Error generating Google OAuth URL: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initialize Google authentication flow."
        )


@router.get("/connect")
def google_connect(
    current_user: Dict[str, Any] = Depends(get_current_user),
    redirect_uri: Optional[str] = None,
):
    """
    Generate Google OAuth URL to link an additional Google account
    (Personal Gmail or Corporate Workspace) to current user session.
    """
    state = f"connect_account:{current_user['_id']}"
    auth_url = google_service.get_authorization_url(state=state, redirect_uri=redirect_uri)
    return {"auth_url": auth_url}


@router.get("/callback")
async def google_callback(
    background_tasks: BackgroundTasks,
    code: Optional[str] = None,
    error: Optional[str] = None,
    state: Optional[str] = None,
):
    """
    OAuth 2.0 callback endpoint invoked by Google upon user consent.
    Exchanges code for tokens, provisions or links account, and issues application JWT.
    """
    if error:
        logger.warning(f"Google OAuth error received: {error}")
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error={error}")

    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authorization code missing in Google callback."
        )

    try:
        exchange_data = await google_service.exchange_code(code)
        tokens = exchange_data["tokens"]
        profile = exchange_data["profile"]

        email = profile["email"].lower().strip()
        full_name = profile.get("name") or email.split("@")[0].capitalize()
        acc_type = google_service.infer_account_type(email, profile)

        # Case 1: Account attachment flow to an existing user session
        if state and state.startswith("connect_account:"):
            target_user_id = state.split(":", 1)[1]
            account_item = {
                "account_id": f"acc_{uuid.uuid4().hex[:8]}",
                "email": email,
                "full_name": full_name,
                "account_type": acc_type,
                "avatar_url": profile.get("picture"),
                "google_tokens": tokens,
                "is_active": True,
                "added_at": datetime.utcnow().isoformat(),
            }
            await db_manager.add_connected_account(target_user_id, account_item)
            await db_manager.set_active_account(target_user_id, account_item["account_id"])

            # Sync initial messages in background without blocking redirection
            async def sync_connected_in_background():
                try:
                    acc_user_repr = {"google_tokens": tokens}
                    live_messages = google_service.fetch_gmail_messages(acc_user_repr, max_results=10)
                    for msg in live_messages:
                        await process_and_store_gmail_message(target_user_id, msg, account_email=email)
                except Exception as sync_err:
                    logger.warning(f"Initial sync for connected account warning: {sync_err}")

            background_tasks.add_task(sync_connected_in_background)

            return RedirectResponse(
                url=f"{settings.FRONTEND_URL}/inbox?account_connected={email}&type={acc_type}",
                status_code=status.HTTP_307_TEMPORARY_REDIRECT,
            )

        # Case 2: Standard Login or Sign-up
        user = await db_manager.get_user_by_email(email)
        if not user:
            acc_id = f"acc_{uuid.uuid4().hex[:8]}"
            user_doc = {
                "email": email,
                "full_name": full_name,
                "auth_provider": "google",
                "google_id": profile.get("sub"),
                "avatar_url": profile.get("picture"),
                "google_tokens": tokens,
                "google_connected": True,
                "created_at": datetime.utcnow().isoformat(),
                "active_account_id": acc_id,
                "connected_accounts": [
                    {
                        "account_id": acc_id,
                        "email": email,
                        "full_name": full_name,
                        "account_type": acc_type,
                        "avatar_url": profile.get("picture"),
                        "google_tokens": tokens,
                        "is_active": True,
                        "added_at": datetime.utcnow().isoformat(),
                    }
                ],
            }
            user = await db_manager.create_user(user_doc)
        else:
            await db_manager.update_user_google_tokens(user["_id"], tokens, account_email=email)

        # Clear mock/sample emails and background-sync real live Gmail messages
        await db_manager.clear_mock_emails(user["_id"])
        
        async def sync_login_in_background(u_id: str, u_tokens: Dict[str, Any], u_email: str):
            try:
                temp_u = {"google_tokens": u_tokens}
                live_messages = google_service.fetch_gmail_messages(temp_u, max_results=10)
                for msg in live_messages:
                    await process_and_store_gmail_message(u_id, msg, account_email=u_email)
                logger.info(f"Auto-synced & triaged {len(live_messages)} live Gmail emails for {u_email}")
            except Exception as sync_err:
                logger.warning(f"Initial live Gmail fetch & triage background warning: {sync_err}")

        background_tasks.add_task(sync_login_in_background, user["_id"], tokens, email)

        # Generate app JWT token
        jwt_token = create_access_token({"sub": user["_id"], "email": email})

        # Redirect user to inbox with the JWT token INSTANTLY
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/inbox?token={jwt_token}&name={full_name}",
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
        )

    except Exception as e:
        logger.error(f"Google callback processing failed: {e}", exc_info=True)
        err_msg = urllib.parse.quote(str(e))
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error={err_msg}")


# ---------------- ACCOUNT SWITCHER ENDPOINTS ----------------

from pydantic import BaseModel

class SwitchAccountPayload(BaseModel):
    account_id: str


@accounts_router.get("")
async def get_connected_accounts(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Retrieve all linked Google accounts and active account filter."""
    return await db_manager.get_connected_accounts(current_user["_id"])


@accounts_router.post("/switch")
async def switch_active_account(
    payload: SwitchAccountPayload,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Switch active account filter ('acc_...', or 'all' for unified view)."""
    success = await db_manager.set_active_account(current_user["_id"], payload.account_id)
    return {
        "status": "success" if success else "unchanged",
        "active_account_id": payload.account_id,
    }


@accounts_router.delete("/{account_id}")
async def disconnect_account(
    account_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Disconnect a secondary Google account."""
    success = await db_manager.remove_connected_account(current_user["_id"], account_id)
    return {"status": "success" if success else "failed"}


# ---------------- GMAIL & CALENDAR SYNC ENDPOINTS ----------------

@sync_router.post("/emails/sync-gmail")
async def sync_gmail(
    max_results: int = Query(default=50, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Synchronize live incoming messages from user's connected Gmail inbox.
    Purges any mock emails so only real messages appear in user's docket.
    """
    if not current_user.get("google_tokens") and not current_user.get("connected_accounts"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please connect your Google account to sync Gmail.",
        )

    try:
        # Purge any remaining mock emails so user sees strictly live inbox
        await db_manager.clear_mock_emails(current_user["_id"])

        # Determine target account tokens
        active_id = current_user.get("active_account_id")
        accounts = current_user.get("connected_accounts", [])
        synced_count = 0
        total_fetched = 0

        target_accounts = []
        if active_id and active_id != "all":
            matched = next((a for a in accounts if a.get("account_id") == active_id), None)
            if matched:
                target_accounts = [matched]
        
        if not target_accounts:
            target_accounts = accounts if accounts else [{"google_tokens": current_user.get("google_tokens"), "email": current_user.get("email")}]

        for acc in target_accounts:
            tokens = acc.get("google_tokens")
            if not tokens:
                continue
            acc_email = acc.get("email")
            user_repr = {"google_tokens": tokens}
            messages = google_service.fetch_gmail_messages(user_repr, max_results=max_results)
            total_fetched += len(messages)

            for msg in messages:
                google_id = msg.get("google_id")
                existing = await db_manager.get_email_by_google_id(current_user["_id"], google_id)
                if not existing:
                    await process_and_store_gmail_message(current_user["_id"], msg, account_email=acc_email)
                    synced_count += 1

        return {
            "status": "success",
            "message": f"Successfully synced and AI-triaged {synced_count} new messages from Gmail.",
            "synced_count": synced_count,
            "total_fetched": total_fetched,
        }
    except Exception as e:
        logger.error(f"Failed to sync Gmail: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gmail sync failed: {str(e)}",
        )


@sync_router.post("/calendar/sync-google")
async def sync_google_calendar(
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Synchronize upcoming events from the user's primary Google Calendar.
    """
    if not current_user.get("google_tokens"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please connect your Google account to sync Google Calendar.",
        )

    try:
        events = google_service.fetch_calendar_events(current_user)
        synced_count = 0

        for evt in events:
            doc = {
                "user_id": current_user["_id"],
                "subject": evt["subject"],
                "preferred_day": evt["preferred_day"],
                "duration_minutes": evt["duration_minutes"],
                "confirmed": evt["confirmed"],
                "hangout_link": evt.get("hangout_link"),
                "attendees": evt.get("attendees", []),
                "source": "google_calendar",
            }
            await db_manager.create_calendar_event(doc)
            synced_count += 1

        return {
            "status": "success",
            "message": f"Successfully synced {synced_count} events from Google Calendar.",
            "synced_count": synced_count,
        }
    except Exception as e:
        logger.error(f"Failed to sync Google Calendar: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Calendar sync failed: {str(e)}",
        )
