def test_register_and_login(client):
    r = client.post("/api/register", json={"username": "bob_1", "password": "password123"})
    assert r.status_code == 201
    r = client.post("/api/login", json={"username": "bob_1", "password": "password123"})
    assert r.status_code == 200 and "token" in r.get_json()


def test_register_validation_and_duplicate(client):
    r = client.post("/api/register", json={"username": "x", "password": "short"})
    assert r.status_code == 400
    assert set(r.get_json()["details"]) == {"username", "password"}
    ok = {"username": "carol", "password": "password123"}
    client.post("/api/register", json=ok)
    assert client.post("/api/register", json=ok).status_code == 409


def test_login_wrong_password(client):
    client.post("/api/register", json={"username": "dave", "password": "password123"})
    r = client.post("/api/login", json={"username": "dave", "password": "nope-nope"})
    assert r.status_code == 401


def test_notes_require_token(client):
    assert client.get("/api/notes").status_code == 401
    r = client.get("/api/notes", headers={"Authorization": "Bearer garbage"})
    assert r.status_code == 401


def test_note_crud(client, auth_headers):
    r = client.post("/api/notes", json={"title": "First", "body": "hello"}, headers=auth_headers)
    assert r.status_code == 201
    nid = r.get_json()["id"]

    assert client.get(f"/api/notes/{nid}", headers=auth_headers).get_json()["title"] == "First"

    r = client.put(f"/api/notes/{nid}", json={"title": "Renamed"}, headers=auth_headers)
    assert r.status_code == 200 and r.get_json()["title"] == "Renamed"
    assert r.get_json()["body"] == "hello"

    assert len(client.get("/api/notes", headers=auth_headers).get_json()) == 1
    assert client.delete(f"/api/notes/{nid}", headers=auth_headers).status_code == 204
    assert client.get(f"/api/notes/{nid}", headers=auth_headers).status_code == 404


def test_note_validation(client, auth_headers):
    r = client.post("/api/notes", json={"title": "  "}, headers=auth_headers)
    assert r.status_code == 400 and "title" in r.get_json()["details"]


def test_search(client, auth_headers):
    client.post("/api/notes", json={"title": "Groceries", "body": "milk"}, headers=auth_headers)
    client.post("/api/notes", json={"title": "Work", "body": "deploy"}, headers=auth_headers)
    r = client.get("/api/notes?q=milk", headers=auth_headers)
    assert [n["title"] for n in r.get_json()] == ["Groceries"]


def test_users_cannot_see_each_others_notes(client, auth_headers):
    nid = client.post("/api/notes", json={"title": "Private"}, headers=auth_headers).get_json()["id"]
    client.post("/api/register", json={"username": "mallory", "password": "password123"})
    tok = client.post("/api/login", json={"username": "mallory", "password": "password123"}).get_json()["token"]
    other = {"Authorization": f"Bearer {tok}"}
    assert client.get(f"/api/notes/{nid}", headers=other).status_code == 404
    assert client.delete(f"/api/notes/{nid}", headers=other).status_code == 404


def test_api_404_is_json(client):
    r = client.get("/api/nope")
    assert r.status_code == 404 and r.get_json()["error"]
