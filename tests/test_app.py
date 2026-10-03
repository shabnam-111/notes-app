import pytest
import app as app_module


@pytest.fixture
def client(tmp_path):
    app_module.app.config["DATABASE"] = str(tmp_path / "test.db")
    app_module.app.config["TESTING"] = True
    with app_module.app.app_context():
        app_module.init_db()
    return app_module.app.test_client()


def login(client, username="shabnam", password="secret123"):
    client.post("/register", data={"username": username, "password": password})
    return client.post("/login", data={"username": username, "password": password})


def test_health(client):
    assert client.get("/health").get_json() == {"status": "ok"}


def test_api_requires_login(client):
    assert client.get("/api/notes").status_code == 401


def test_wrong_password_rejected(client):
    login(client)
    res = client.post("/login", data={"username": "shabnam", "password": "wrong"})
    assert b"Invalid username or password" in res.data


def test_crud_flow(client):
    login(client)

    res = client.post("/api/notes", json={"title": "First", "content": "Hello"})
    assert res.status_code == 201
    note_id = res.get_json()["id"]

    assert len(client.get("/api/notes").get_json()) == 1

    res = client.put(f"/api/notes/{note_id}", json={"title": "Edited", "content": "Hi"})
    assert res.get_json()["title"] == "Edited"

    assert client.delete(f"/api/notes/{note_id}").status_code == 204
    assert client.get(f"/api/notes/{note_id}").status_code == 404


def test_title_is_required(client):
    login(client)
    res = client.post("/api/notes", json={"title": "", "content": "x"})
    assert res.status_code == 400
    