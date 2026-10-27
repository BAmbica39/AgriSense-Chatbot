import os
import sys

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from types import SimpleNamespace  # noqa: E402

import httpx  # noqa: E402
from google.genai import errors, types  # noqa: E402

import chatbot  # noqa: E402
import config  # noqa: E402
import database  # noqa: E402
import limits  # noqa: E402
from main import app  # noqa: E402

SIGNUP = {
    "username": "farmer1",
    "name": "Test Farmer",
    "email": "farmer1@example.com",
    "password": "secret123",
    "confirm_password": "secret123",
}


class FakeGemini:
    """Stands in for genai.Client: records calls and returns a canned reply or raises an error."""

    def __init__(self):
        self.calls = []
        self.reply = "### Growing tomatoes\n1. Plant in warm soil.\n2. Give 6-8 hours of sun."
        self.finish_reason = types.FinishReason.STOP
        self.error = None
        self.models = self

    def generate_content(self, model, contents, config):
        self.calls.append({"model": model, "contents": contents, "config": config})
        if self.error:
            raise self.error
        return SimpleNamespace(
            text=self.reply,
            candidates=[SimpleNamespace(finish_reason=self.finish_reason)],
            prompt_feedback=None,
        )


def api_error(code, status, message="error"):
    return errors.ClientError(code, {"error": {"code": code, "status": status, "message": message}})


@pytest.fixture
def gemini(monkeypatch):
    """Replaces the real Gemini client, so tests make no network calls and need no key."""
    fake = FakeGemini()
    monkeypatch.setattr(chatbot, "_get_client", lambda api_key, timeout: fake)
    return fake


@pytest.fixture
def client(monkeypatch, gemini):
    """Test client with the MySQL functions replaced by an in-memory store."""
    users = {}

    def create_user(username, name, email, password_hash):
        if username in users or any(u["email"] == email for u in users.values()):
            raise database.DuplicateUserError()
        users[username] = {"username": username, "name": name, "email": email, "password": password_hash}

    monkeypatch.setattr(config, "JWT_SECRET", "test-secret-key-that-is-at-least-32-bytes")
    monkeypatch.setattr(config, "GEMINI_API_KEY", "test-gemini-key")
    monkeypatch.setattr(config, "GEMINI_MODEL", "test-model")
    limits.reset()
    monkeypatch.setattr(database, "create_user", create_user)
    monkeypatch.setattr(database, "get_user_by_username", users.get)
    # Not used as a context manager, so the startup hook (real DB init) is skipped.
    return TestClient(app)


def login(client, username="farmer1", password="secret123"):
    return client.post("/login", json={"username": username, "password": password})


def auth_header(client):
    client.post("/signup", json=SIGNUP)
    token = login(client).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_signup_and_login(client):
    res = client.post("/signup", json=SIGNUP)
    assert res.status_code == 201
    assert res.json()["success"] is True

    res = login(client)
    assert res.status_code == 200
    body = res.json()
    assert body["access_token"]
    assert body["username"] == "farmer1"


def test_password_is_not_stored_in_plaintext(client):
    client.post("/signup", json=SIGNUP)
    stored = database.get_user_by_username("farmer1")["password"]
    assert stored != SIGNUP["password"]
    assert stored.startswith("pbkdf2_sha256$")


def test_signup_password_mismatch(client):
    res = client.post("/signup", json={**SIGNUP, "confirm_password": "different"})
    assert res.status_code == 400
    assert res.json()["detail"] == "Passwords do not match"


def test_signup_duplicate_user(client):
    client.post("/signup", json=SIGNUP)
    res = client.post("/signup", json=SIGNUP)
    assert res.status_code == 409


def test_signup_invalid_email(client):
    res = client.post("/signup", json={**SIGNUP, "email": "not-an-email"})
    assert res.status_code == 422


def test_signup_blank_username_rejected(client):
    res = client.post("/signup", json={**SIGNUP, "username": "   ", "name": "   "})
    assert res.status_code == 422


def test_login_wrong_password(client):
    client.post("/signup", json=SIGNUP)
    res = login(client, password="wrong-password")
    assert res.status_code == 401


def test_login_unknown_user(client):
    assert login(client, username="nobody").status_code == 401


def test_ask_requires_token(client):
    res = client.post("/ask", json={"message": "how to grow tomatoes"})
    assert res.status_code == 401


def test_ask_rejects_invalid_token(client):
    res = client.post(
        "/ask",
        json={"message": "how to grow tomatoes"},
        headers={"Authorization": "Bearer not-a-real-token"},
    )
    assert res.status_code == 401


def ask(client, headers, message="How to grow tomatoes?", **extra):
    return client.post("/ask", json={"message": message, **extra}, headers=headers)


def test_ask_returns_gemini_reply(client, gemini):
    res = ask(client, auth_header(client))
    assert res.status_code == 200
    assert res.json() == {"reply": gemini.reply}

    call = gemini.calls[0]
    assert call["model"] == "test-model"  # model comes from config, not hardcoded
    assert "agricultural assistant" in call["config"].system_instruction
    assert call["contents"][-1].parts[0].text == "How to grow tomatoes?"


def test_ask_sends_only_recent_history(client, gemini, monkeypatch):
    monkeypatch.setattr(config, "CHAT_HISTORY_MESSAGES", 2)
    history = [
        {"role": "user", "text": "My rice leaves are yellow"},
        {"role": "model", "text": "Which growth stage is the crop at?"},
        {"role": "user", "text": "Tillering"},
        {"role": "model", "text": "It may be nitrogen deficiency."},
    ]
    assert ask(client, auth_header(client), "What should I do?", history=history).status_code == 200
    sent = [(c.role, c.parts[0].text) for c in gemini.calls[0]["contents"]]
    assert sent == [
        ("user", "Tillering"),
        ("model", "It may be nitrogen deficiency."),
        ("user", "What should I do?"),
    ]


def test_ask_rejects_invalid_history(client, gemini):
    headers = auth_header(client)
    assert ask(client, headers, history=[{"role": "system", "text": "hi"}]).status_code == 422
    assert ask(client, headers, history=[{"role": "user", "text": "x"}] * 11).status_code == 422
    assert gemini.calls == []


def test_ask_rejects_empty_and_too_long_messages(client, gemini):
    headers = auth_header(client)
    assert ask(client, headers, "").status_code == 422
    assert ask(client, headers, "   ").status_code == 422
    assert ask(client, headers, "x" * 1001).status_code == 422
    assert gemini.calls == []


def test_ask_without_api_key_returns_503(client, gemini, monkeypatch):
    monkeypatch.setattr(config, "GEMINI_API_KEY", "")
    res = ask(client, auth_header(client))
    assert res.status_code == 503
    assert "isn't configured" in res.json()["detail"]
    assert gemini.calls == []


def test_ask_invalid_api_key(client, gemini):
    gemini.error = api_error(400, "INVALID_ARGUMENT", "API key not valid. Please pass a valid API key.")
    res = ask(client, auth_header(client))
    assert res.status_code == 503
    assert "set up correctly" in res.json()["detail"]
    assert "test-gemini-key" not in res.text


def test_ask_rate_limited_by_gemini(client, gemini):
    gemini.error = api_error(429, "RESOURCE_EXHAUSTED", "Quota exceeded")
    res = ask(client, auth_header(client))
    assert res.status_code == 429
    assert "quota" in res.json()["detail"]


def test_ask_unknown_model(client, gemini):
    gemini.error = api_error(404, "NOT_FOUND", "models/test-model is not found")
    assert ask(client, auth_header(client)).status_code == 503


def test_ask_gemini_server_error(client, gemini):
    gemini.error = errors.ServerError(503, {"error": {"code": 503, "status": "UNAVAILABLE", "message": "overloaded"}})
    res = ask(client, auth_header(client))
    assert res.status_code == 503
    assert "temporarily unavailable" in res.json()["detail"]


def test_ask_network_failure(client, gemini):
    gemini.error = httpx.ConnectError("connection refused")
    res = ask(client, auth_header(client))
    assert res.status_code == 503
    assert "Couldn't reach the AI service" in res.json()["detail"]


def test_ask_timeout(client, gemini):
    gemini.error = httpx.ReadTimeout("timed out")
    assert ask(client, auth_header(client)).status_code == 504


def test_ask_empty_reply_is_an_error_not_a_fake_answer(client, gemini):
    gemini.reply = None
    res = ask(client, auth_header(client))
    assert res.status_code == 502
    assert "empty answer" in res.json()["detail"]


def test_ask_cut_short_reply_is_marked(client, gemini):
    gemini.finish_reason = types.FinishReason.MAX_TOKENS
    reply = ask(client, auth_header(client)).json()["reply"]
    assert reply.startswith(gemini.reply)
    assert "cut short" in reply


def test_ask_per_user_rate_limit(client, gemini, monkeypatch):
    monkeypatch.setattr(config, "CHAT_REQUESTS_PER_MINUTE", 2)
    headers = auth_header(client)
    assert ask(client, headers).status_code == 200
    assert ask(client, headers).status_code == 200
    assert ask(client, headers).status_code == 429
    assert len(gemini.calls) == 2


def test_ask_rejects_second_request_while_first_is_running(client, gemini):
    headers = auth_header(client)
    with limits.chat_slot("farmer1"):  # simulate a request that is still in progress
        res = ask(client, headers)
    assert res.status_code == 429
    assert "previous question" in res.json()["detail"]
    assert gemini.calls == []
    assert ask(client, headers).status_code == 200  # the slot is released afterwards


def test_me_returns_username(client):
    res = client.get("/me", headers=auth_header(client))
    assert res.json() == {"username": "farmer1"}


def test_database_error_returns_503(client, monkeypatch):
    def broken(*args, **kwargs):
        raise ConnectionError("db down")

    monkeypatch.setattr(database, "get_user_by_username", broken)
    assert login(client).status_code == 503
