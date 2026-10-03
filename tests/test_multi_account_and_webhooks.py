"""
Unit tests for Multi-Account Switcher & Google Cloud Pub/Sub Webhooks.
"""
import base64
import json
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.database.mongo import db_manager

client = TestClient(app)


@pytest.fixture
def auth_header():
    """Create a verified test user and return Authorization headers."""
    email = "executive.multi@testcorp.com"
    signup = client.post("/api/auth/signup", json={
        "full_name": "Executive Officer",
        "email": email,
        "password": "Password123!",
    })
    if signup.status_code == 200:
        token = signup.json()["access_token"]
    else:
        login = client.post("/api/auth/login", json={
            "email": email,
            "password": "Password123!",
        })
        token = login.json()["access_token"]

    return {"Authorization": f"Bearer {token}"}


def test_multi_account_lifecycle(auth_header):
    import asyncio
    async def _run():
        # 1. Fetch initial accounts
        res = client.get("/api/accounts", headers=auth_header)
        assert res.status_code == 200
        data = res.json()
        assert "active_account_id" in data
        assert "accounts" in data

        # 2. Add a connected Google Workspace account
        me = client.get("/api/auth/me", headers=auth_header).json()
        user_id = me["id"]

        workspace_acc = {
            "account_id": "acc_workspace_01",
            "email": "corp.strategy@acme-enterprises.org",
            "full_name": "Executive (Work)",
            "account_type": "workspace",
            "google_tokens": {"access_token": "mock_token_work"},
            "is_active": True,
        }
        await db_manager.add_connected_account(user_id, workspace_acc)

        # 3. Verify account appears in list
        res2 = client.get("/api/accounts", headers=auth_header)
        assert res2.status_code == 200
        accs = res2.json()["accounts"]
        found = next((a for a in accs if a["email"] == "corp.strategy@acme-enterprises.org"), None)
        assert found is not None
        assert found["account_type"] == "workspace"

        # 4. Switch active account to workspace
        switch_res = client.post(
            "/api/accounts/switch",
            headers=auth_header,
            json={"account_id": "acc_workspace_01"},
        )
        assert switch_res.status_code == 200
        assert switch_res.json()["active_account_id"] == "acc_workspace_01"

        # 5. Switch to 'all' (Unified Docket)
        switch_all = client.post(
            "/api/accounts/switch",
            headers=auth_header,
            json={"account_id": "all"},
        )
        assert switch_all.status_code == 200
        assert switch_all.json()["active_account_id"] == "all"

        # 6. Disconnect secondary account
        del_res = client.delete("/api/accounts/acc_workspace_01", headers=auth_header)
        assert del_res.status_code == 200
        assert del_res.json()["status"] == "success"

    asyncio.run(_run())


def test_google_connect_url_generation(auth_header):
    """Test generating OAuth URL to attach a second Google account."""
    import urllib.parse
    res = client.get("/api/auth/google/connect", headers=auth_header)
    assert res.status_code == 200
    auth_url = res.json()["auth_url"]
    assert "accounts.google.com" in auth_url
    assert "connect_account:" in urllib.parse.unquote(auth_url)


def test_simulated_push_webhook(auth_header):
    """Test instant push ingestion and real-time AI triage."""
    payload = {
        "author": "Marcus Sterling <m.sterling@capital-holdings.co.uk>",
        "to": "executive.multi@testcorp.com",
        "subject": "Urgent: Acquisition Term Sheet Review",
        "email_thread": (
            "Good afternoon.\n\n"
            "We have revised clause 4.2 in the term sheet. Can we convene tomorrow at 3:00 PM "
            "for 20 minutes to confirm final approval?\n\n"
            "Sincerely,\nMarcus Sterling"
        ),
        "account_email": "executive.multi@testcorp.com",
    }
    res = client.post("/api/webhooks/test-incoming", headers=auth_header, json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    email = data["email"]
    assert email["subject"] == "Urgent: Acquisition Term Sheet Review"
    assert email["classification"] in ["respond", "notify", "ignore"]
    assert len(email["reasoning"]) > 0
    if email["classification"] == "respond":
        assert email["status"] == "drafted"
        assert len(email["draft_response"]) > 0


def test_google_pubsub_webhook_acknowledgement():
    """Test standard Google Cloud Pub/Sub push subscription delivery."""
    event_data = {
        "emailAddress": "nonexistent.user@example.com",
        "historyId": "999888777",
    }
    encoded = base64.b64encode(json.dumps(event_data).encode("utf-8")).decode("utf-8")

    pubsub_body = {
        "message": {
            "data": encoded,
            "messageId": "msg_test_12345",
            "publishTime": "2026-10-03T14:40:00Z",
        },
        "subscription": "projects/aethermail-cloud/subscriptions/gmail-push-sub",
    }

    res = client.post("/api/webhooks/google-pubsub", json=pubsub_body)
    assert res.status_code == 200
    assert res.json()["status"] in ["acknowledged", "success"]
