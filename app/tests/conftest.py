import os

import pytest

from app import create_app
from app.models import db


@pytest.fixture()
def app():
    app = create_app(
        {"TESTING": True, "SQLALCHEMY_DATABASE_URI": os.getenv("TEST_DATABASE_URL", "sqlite://")}
    )
    yield app
    with app.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def auth_headers(client):
    client.post("/api/register", json={"username": "alice", "password": "password123"})
    token = client.post(
        "/api/login", json={"username": "alice", "password": "password123"}
    ).get_json()["token"]
    return {"Authorization": f"Bearer {token}"}
