import pytest

from app import create_app


def test_refuses_to_start_without_secrets_when_a_database_is_configured(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "sqlite://")
    monkeypatch.delenv("SECRET_KEY", raising=False)
    monkeypatch.delenv("JWT_SECRET", raising=False)
    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        create_app()


def test_local_dev_works_without_any_configuration(monkeypatch, tmp_path):
    monkeypatch.chdir(tmp_path)
    for var in ("DATABASE_URL", "SECRET_KEY", "JWT_SECRET"):
        monkeypatch.delenv(var, raising=False)
    assert create_app().test_client().get("/health").status_code == 200


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200 and r.get_json()["status"] == "ok"


def test_metrics_exposes_app_metrics(client, auth_headers):
    client.post("/api/notes", json={"title": "m"}, headers=auth_headers)
    body = client.get("/metrics").get_data(as_text=True)
    assert "notes_http_requests_total" in body
    assert "notes_created_total" in body
