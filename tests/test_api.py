"""Unit tests for AI Email Assistant API and workflows."""
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.email_service import email_service
from backend.app.agent.memory import preference_store

client = TestClient(app)


def setup_function():
    """Reset data before each test."""
    email_service.load_sample_dataset()


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data


def test_list_emails():
    response = client.get("/api/emails")
    assert response.status_code == 200
    emails = response.json()
    assert isinstance(emails, list)
    assert len(emails) > 0


def test_email_stats():
    response = client.get("/api/emails/stats/summary")
    assert response.status_code == 200
    stats = response.json()
    assert "total" in stats
    assert "unread" in stats
    assert stats["total"] > 0


def test_triage_single_email():
    response = client.post("/api/triage", json={"email_id": "email_1"})
    assert response.status_code == 200
    data = response.json()
    assert data["classification"] in ["respond", "notify", "ignore"]
    assert len(data["reasoning"]) > 0


def test_batch_triage():
    response = client.post("/api/triage/all")
    assert response.status_code == 200
    results = response.json()
    assert isinstance(results, list)


def test_generate_draft():
    response = client.post("/api/hitl/draft", json={"email_id": "email_1"})
    assert response.status_code == 200
    data = response.json()
    assert "subject" in data
    assert "body" in data
    assert len(data["body"]) > 0


def test_hitl_accept_action():
    response = client.post(
        "/api/hitl/action",
        json={
            "email_id": "email_1",
            "action": "accept",
            "edited_subject": "Re: Quick question",
            "edited_body": "Here is the answer.",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["status"] == "sent"


def test_hitl_edit_and_memory_update():
    response = client.post(
        "/api/hitl/action",
        json={
            "email_id": "email_4",
            "action": "edit",
            "edited_subject": "Re: Tax season strategy",
            "edited_body": "I prefer 15-minute quick syncs.",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["status"] == "sent"


def test_get_and_update_preferences():
    # Get preferences
    get_res = client.get("/api/memory")
    assert get_res.status_code == 200
    prefs = get_res.json()
    assert "background" in prefs
    assert "triage_instructions" in prefs

    # Update preferences
    post_res = client.post(
        "/api/memory",
        json={"background": "Lead Architect at AI Corp"},
    )
    assert post_res.status_code == 200
    updated_prefs = post_res.json()
    assert updated_prefs["background"] == "Lead Architect at AI Corp"


def test_calendar_events():
    get_res = client.get("/api/calendar/events")
    assert get_res.status_code == 200
    events = get_res.json()
    assert isinstance(events, list)
