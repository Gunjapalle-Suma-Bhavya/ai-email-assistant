"""Unit tests for Auth, Drafts, and Feedback API endpoints."""
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_auth_signup_and_login_flow():
    # Test signup
    unique_email = "testuser@example.com"
    signup_res = client.post("/api/auth/signup", json={
        "full_name": "Test User",
        "email": unique_email,
        "password": "strongPassword123"
    })
    assert signup_res.status_code == 200
    data = signup_res.json()
    assert "access_token" in data
    token = data["access_token"]
    assert data["user"]["email"] == unique_email

    # Test me with token
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == unique_email

    # Test login
    login_res = client.post("/api/auth/login", json={
        "email": unique_email,
        "password": "strongPassword123"
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()


def test_drafts_api():
    # List drafts
    res = client.get("/api/drafts")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_feedback_api():
    # Submit feedback
    post_res = client.post("/api/feedback", json={
        "feedback_text": "Prefer friendly greetings and concise next steps",
        "category": "response_preferences"
    })
    assert post_res.status_code == 200
    assert post_res.json()["success"] is True

    # List feedback
    list_res = client.get("/api/feedback")
    assert list_res.status_code == 200
    assert isinstance(list_res.json(), list)
    assert len(list_res.json()) > 0


def test_google_oauth_login_redirect():
    # Test that /api/auth/google/login issues a 307 redirect towards Google's consent screen
    res = client.get("/api/auth/google/login", follow_redirects=False)
    assert res.status_code in [302, 307]
    location = res.headers.get("location", "")
    assert "accounts.google.com" in location
    assert "client_id=" in location
    assert "scope=" in location


def test_google_sync_endpoints_require_auth():
    # Sync endpoints must require authentication
    gmail_res = client.post("/api/emails/sync-gmail")
    assert gmail_res.status_code == 401

    cal_res = client.post("/api/calendar/sync-google")
    assert cal_res.status_code == 401


def test_google_callback_error_handling():
    # Test that error received from Google consent redirects cleanly to login
    res = client.get("/api/auth/google/callback?error=access_denied", follow_redirects=False)
    assert res.status_code in [302, 307]
    assert "error=access_denied" in res.headers.get("location", "")
