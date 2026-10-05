import re


def _csrf(client, path):
    html = client.get(path).get_data(as_text=True)
    return re.search(r'name="_csrf" value="([^"]+)"', html).group(1)


def _signup_and_login(client):
    t = _csrf(client, "/register")
    client.post("/register", data={"_csrf": t, "username": "erin", "password": "password123"})
    t = _csrf(client, "/login")
    return client.post("/login", data={"_csrf": t, "username": "erin", "password": "password123"})


def test_index_redirects_when_anonymous(client):
    r = client.get("/")
    assert r.status_code == 302 and "/login" in r.headers["Location"]


def test_post_without_csrf_is_rejected(client):
    r = client.post("/login", data={"username": "a", "password": "b"})
    assert r.status_code == 400


def test_full_web_flow(client):
    assert _signup_and_login(client).status_code == 302

    t = _csrf(client, "/notes/new")
    r = client.post("/notes/new", data={"_csrf": t, "title": "Hello", "body": "World"})
    assert r.status_code == 302
    assert "Hello" in client.get("/").get_data(as_text=True)

    t = _csrf(client, "/notes/1/edit")
    client.post("/notes/1/edit", data={"_csrf": t, "title": "Edited", "body": "x"})
    assert "Edited" in client.get("/").get_data(as_text=True)

    t = _csrf(client, "/")
    client.post("/notes/1/delete", data={"_csrf": t})
    assert "Nothing written yet" in client.get("/").get_data(as_text=True)


def test_web_validation_error(client):
    _signup_and_login(client)
    t = _csrf(client, "/notes/new")
    r = client.post("/notes/new", data={"_csrf": t, "title": "", "body": ""})
    assert r.status_code == 400 and "Title is required" in r.get_data(as_text=True)


def test_missing_note_404_page(client):
    _signup_and_login(client)
    r = client.get("/notes/999/edit")
    assert r.status_code == 404 and "Back to your notes" in r.get_data(as_text=True)
