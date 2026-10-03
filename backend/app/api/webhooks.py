"""
Google Cloud Pub/Sub Webhook & Real-Time Push Ingestion Service.
Handles Google Cloud Pub/Sub push deliveries, Gmail mailbox watch registration,
and simulated push events for development and instant verification.
"""
import base64
import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, Request, status, Query
from pydantic import BaseModel

from backend.app.config import settings
from backend.app.database.mongo import db_manager
from backend.app.services.google_service import google_service
from backend.app.auth.dependencies import get_current_user, get_optional_user
from backend.app.api.google_auth import process_and_store_gmail_message

logger = logging.getLogger("api.webhooks")

router = APIRouter(prefix="/webhooks", tags=["Google Pub/Sub Webhooks"])


class PubSubMessage(BaseModel):
    data: Optional[str] = None
    messageId: Optional[str] = None
    publishTime: Optional[str] = None


class PubSubPushPayload(BaseModel):
    message: Optional[PubSubMessage] = None
    subscription: Optional[str] = None


class TestIncomingEmailPayload(BaseModel):
    author: str = "Dr. Alexander Wright <alexander.wright@oxford-research.org>"
    to: Optional[str] = None
    subject: str = "Urgent: Q4 Executive Partnership & Strategy Session"
    email_thread: str = (
        "Good morning.\n\n"
        "Could we meet this Thursday at 2:00 PM for 30 minutes to review the executive partnership agenda? "
        "Please let me know if this slot suits your schedule.\n\n"
        "Warm regards,\nAlexander"
    )
    account_email: Optional[str] = None


@router.post("/google-pubsub")
async def google_pubsub_webhook(
    payload: PubSubPushPayload,
    token: Optional[str] = Query(None),
):
    """
    Google Cloud Pub/Sub Push Subscription Webhook.
    Receives notification from Google when a new message arrives in a watched Gmail inbox.
    Decodes the push payload, looks up the corresponding account, fetches new messages,
    and runs the AI triage and draft generation pipeline.
    """
    # Verify optional webhook security token if configured
    if settings.GOOGLE_PUBSUB_VERIFICATION_TOKEN:
        if token != settings.GOOGLE_PUBSUB_VERIFICATION_TOKEN:
            logger.warning("Pub/Sub webhook rejected: invalid verification token")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid Pub/Sub verification token",
            )

    if not payload.message or not payload.message.data:
        logger.info("Received empty or heartbeat Pub/Sub message")
        return {"status": "ok", "message": "No data in payload"}

    try:
        # 1. Base64-decode the Pub/Sub payload
        raw_data = base64.b64decode(payload.message.data).decode("utf-8")
        event = json.loads(raw_data)
        email_address = event.get("emailAddress")
        history_id = event.get("historyId")

        logger.info(f"Pub/Sub push event received for {email_address} (historyId={history_id})")

        if not email_address:
            return {"status": "ignored", "reason": "No emailAddress in payload"}

        # 2. Match the email to a registered user or connected account
        user = await db_manager.get_user_by_connected_email(email_address)
        if not user:
            logger.warning(f"No user found matching Pub/Sub email: {email_address}")
            return {"status": "acknowledged", "reason": "User not found"}

        # 3. Find the tokens for this specific account
        tokens = None
        for acc in user.get("connected_accounts", []):
            if acc.get("email", "").lower() == email_address.lower():
                tokens = acc.get("google_tokens")
                break
        if not tokens:
            tokens = user.get("google_tokens")

        if not tokens:
            logger.warning(f"No tokens available for {email_address}")
            return {"status": "acknowledged", "reason": "No tokens for account"}

        # 4. Fetch the latest live messages for this account
        user_repr = {"google_tokens": tokens}
        messages = google_service.fetch_gmail_messages(user_repr, max_results=5)
        new_count = 0

        for msg in messages:
            google_id = msg.get("google_id")
            existing = await db_manager.get_email_by_google_id(user["_id"], google_id)
            if not existing:
                await process_and_store_gmail_message(user["_id"], msg, account_email=email_address)
                new_count += 1

        logger.info(f"Pub/Sub webhook successfully ingested and AI-triaged {new_count} new messages for {email_address}")
        return {
            "status": "success",
            "email": email_address,
            "new_messages_triaged": new_count,
        }

    except Exception as e:
        logger.error(f"Error processing Google Pub/Sub push notification: {e}", exc_info=True)
        # Always return HTTP 200 to Pub/Sub to prevent infinite re-delivery retry loops
        return {"status": "error_logged", "error": str(e)}


@router.post("/test-incoming")
async def test_simulated_push(
    payload: TestIncomingEmailPayload,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user),
):
    """
    Simulated Push Notification Webhook for local testing and development.
    Instantly runs the full AI triage, draft generation, and calendar coordination pipeline
    as if delivered directly by a Google Pub/Sub real-time webhook.
    """
    user_id = current_user.get("_id") if current_user else "default_user"
    to_addr = payload.to or (current_user.get("email") if current_user else "executive@example.com")
    acc_email = payload.account_email or to_addr

    msg = {
        "google_id": f"sim_{int(datetime.utcnow().timestamp())}",
        "author": payload.author,
        "to": to_addr,
        "subject": payload.subject,
        "email_thread": payload.email_thread,
        "received_at": datetime.utcnow().isoformat(),
        "account_email": acc_email,
    }

    created = await process_and_store_gmail_message(user_id, msg, account_email=acc_email)
    logger.info(f"Simulated push notification processed: {created['_id']} (triage: {created.get('classification')})")

    return {
        "status": "success",
        "message": "Real-time push email received, triaged, and drafted by AI.",
        "email": created,
    }


@router.post("/watch")
async def register_gmail_watch(
    account_email: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Register a push watch on the user's Gmail mailbox using configured GOOGLE_PUBSUB_TOPIC.
    """
    topic = settings.GOOGLE_PUBSUB_TOPIC
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GOOGLE_PUBSUB_TOPIC is not configured in backend settings.",
        )

    # Resolve target account
    tokens = None
    target_email = account_email or current_user.get("email")
    for acc in current_user.get("connected_accounts", []):
        if acc.get("email", "").lower() == target_email.lower():
            tokens = acc.get("google_tokens")
            break
    if not tokens:
        tokens = current_user.get("google_tokens")

    if not tokens:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target account has no Google credentials.",
        )

    try:
        user_repr = {"google_tokens": tokens}
        res = google_service.watch_mailbox(user_repr, topic)
        return {
            "status": "success",
            "message": f"Gmail watch active on topic: {topic}",
            "historyId": res.get("historyId"),
            "expiration": res.get("expiration"),
        }
    except Exception as e:
        logger.error(f"Failed to register Gmail watch: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gmail watch registration failed: {str(e)}",
        )


@router.post("/stop-watch")
async def stop_gmail_watch(
    account_email: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Stop push watch on the user's Gmail mailbox.
    """
    tokens = None
    target_email = account_email or current_user.get("email")
    for acc in current_user.get("connected_accounts", []):
        if acc.get("email", "").lower() == target_email.lower():
            tokens = acc.get("google_tokens")
            break
    if not tokens:
        tokens = current_user.get("google_tokens")

    if not tokens:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target account has no Google credentials.",
        )

    try:
        user_repr = {"google_tokens": tokens}
        google_service.stop_watch_mailbox(user_repr)
        return {"status": "success", "message": "Gmail watch stopped successfully."}
    except Exception as e:
        logger.error(f"Failed to stop Gmail watch: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to stop Gmail watch: {str(e)}",
        )
