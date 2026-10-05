import io
import re

from sqlalchemy import create_engine, text

from app.models import Image, Note, db
from app.schema import ensure_schema

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64


def _csrf(client, path="/"):
    html = client.get(path).get_data(as_text=True)
    return re.search(r'name="_csrf" value="([^"]+)"', html).group(1)


def _login(client, name="erin"):
    t = _csrf(client, "/register")
    client.post("/register", data={"_csrf": t, "username": name, "password": "password123"})
    t = _csrf(client, "/login")
    client.post("/login", data={"_csrf": t, "username": name, "password": "password123"})


def _new(client, title, body, pinned=False):
    t = _csrf(client, "/notes/new")
    data = {"_csrf": t, "title": title, "body": body}
    if pinned:
        data["pinned"] = "on"
    return client.post("/notes/new", data=data)


# ---------- pinning ----------
def test_pinned_notes_sort_first_and_toggle(client):
    _login(client)
    _new(client, "Old", "<p>x</p>")
    _new(client, "Newer", "<p>y</p>")
    html = client.get("/").get_data(as_text=True)
    assert html.index("Newer") < html.index("Old") and "Pinned" not in html.split("<main>")[1].split("Newer")[0]

    t = _csrf(client)
    assert client.post("/notes/1/pin", data={"_csrf": t, "back": "index"}).status_code == 302
    html = client.get("/").get_data(as_text=True)
    assert html.index("Old") < html.index("Newer")
    assert 'aria-pressed="true"' in html and "Unpin note" in html

    client.post("/notes/1/pin", data={"_csrf": _csrf(client), "back": "index"})
    assert 'aria-pressed="true"' not in client.get("/").get_data(as_text=True)


def test_pin_from_form_checkbox(client, app):
    _login(client)
    _new(client, "Pinned at creation", "<p>z</p>", pinned=True)
    with app.app_context():
        assert Note.query.first().pinned is True


def test_cannot_pin_someone_elses_note(client):
    _login(client, "alice1")
    _new(client, "Mine", "<p>m</p>")
    client.post("/logout", data={"_csrf": _csrf(client)})
    _login(client, "mallory")
    assert client.post("/notes/1/pin", data={"_csrf": _csrf(client)}).status_code == 404
    assert client.get("/notes/1").status_code == 404


def test_api_pin_roundtrip(client, auth_headers):
    r = client.post("/api/notes", json={"title": "a", "pinned": True}, headers=auth_headers)
    assert r.get_json()["pinned"] is True
    client.post("/api/notes", json={"title": "b"}, headers=auth_headers)
    titles = [n["title"] for n in client.get("/api/notes", headers=auth_headers).get_json()]
    assert titles == ["a", "b"]
    nid = r.get_json()["id"]
    assert client.put(f"/api/notes/{nid}", json={"pinned": False}, headers=auth_headers).get_json()["pinned"] is False
    assert client.put(f"/api/notes/{nid}", json={"pinned": "yes"}, headers=auth_headers).status_code == 400
    assert len(client.get("/api/notes?pinned=true", headers=auth_headers).get_json()) == 0


# ---------- rich text ----------
def test_rich_note_is_sanitised_on_save_and_render(client, app):
    _login(client)
    _new(client, "Rich", '<p><strong style="color: rgb(230, 0, 0);">bold</strong><script>alert(1)</script></p>')
    with app.app_context():
        note = Note.query.first()
        assert note.body_format == "html" and "<script" not in note.body and "bold" in note.search_text
    page = client.get("/notes/1").get_data(as_text=True)
    assert "rgb(230, 0, 0)" in page and "<script>alert" not in page


def test_html_stored_in_db_is_resanitised_when_rendered(client, app):
    _login(client)
    _new(client, "Tampered", "<p>fine</p>")
    with app.app_context():
        db.session.get(Note, 1).body = '<p>fine</p><img src=x onerror="alert(1)">'
        db.session.commit()
    page = client.get("/notes/1").get_data(as_text=True)
    assert "onerror" not in page


def test_edit_form_prefills_editor_and_escapes_plain_text_notes(client, app):
    _login(client)
    with app.app_context():
        n = Note(user_id=1, title="legacy", body="1 < 2\nsecond line", body_format="text")
        db.session.add(n)
        db.session.commit()
    page = client.get("/notes/1/edit").get_data(as_text=True)
    assert "<p>1 &lt; 2</p><p>second line</p>" in page


def test_search_ignores_markup(client):
    _login(client)
    _new(client, "Alpha", '<p><span style="color: #ff0000;">needle</span></p>')
    _new(client, "Beta", "<p>nothing</p>")
    assert "Alpha" in client.get("/?q=needle").get_data(as_text=True)
    for markup_word in ("span", "style", "color", "strong"):
        assert "Alpha" not in client.get(f"/?q={markup_word}").get_data(as_text=True)


def test_api_html_notes_are_sanitised(client, auth_headers):
    r = client.post("/api/notes", json={"title": "h", "body": "<p onclick='x()'>hi</p>", "body_format": "html"},
                    headers=auth_headers)
    assert r.status_code == 201 and "onclick" not in r.get_json()["body"]
    r = client.post("/api/notes", json={"title": "h", "body": "x", "body_format": "markdown"}, headers=auth_headers)
    assert r.status_code == 400


# ---------- images ----------
def _upload(client, data, name="p.png", token=None):
    return client.post("/uploads/image", data={"image": (io.BytesIO(data), name)},
                       headers={"X-CSRF-Token": token or _csrf(client)}, content_type="multipart/form-data")


def test_image_upload_and_owner_only_access(client):
    _login(client, "owner1")
    r = _upload(client, PNG)
    assert r.status_code == 201
    url = r.get_json()["url"]
    got = client.get(url)
    assert got.status_code == 200 and got.mimetype == "image/png" and got.data == PNG
    client.post("/logout", data={"_csrf": _csrf(client)})
    assert client.get(url).status_code == 302          # anonymous -> login
    _login(client, "intruder")
    assert client.get(url).status_code == 404          # someone else's image


def test_upload_requires_login_and_csrf(client):
    assert _upload(client, PNG, token="x").status_code in (302, 400)
    _login(client)
    assert _upload(client, PNG, token="wrong").status_code == 400


def test_upload_rejects_non_images_even_if_named_png(client, app):
    _login(client)
    assert _upload(client, b"<svg xmlns='http://www.w3.org/2000/svg' onload='alert(1)'/>", "x.png").status_code == 400
    assert _upload(client, b"MZ\x90\x00 fake exe", "x.png").status_code == 400
    assert _upload(client, b"%PDF-1.7", "x.png").status_code == 400
    with app.app_context():
        assert Image.query.count() == 0


def test_upload_size_limit(client, app):
    _login(client)
    big = PNG + b"\x00" * (app.config["MAX_IMAGE_BYTES"] + 10)
    r = _upload(client, big)
    assert r.status_code == 413 and "too large" in r.get_json()["error"]


def test_upload_quota(client, app):
    app.config["MAX_IMAGES_PER_USER"] = 2
    _login(client)
    assert _upload(client, PNG).status_code == 201
    assert _upload(client, PNG).status_code == 201
    assert _upload(client, PNG).status_code == 400


def test_note_thumbnail_on_card(client):
    _login(client)
    url = _upload(client, PNG).get_json()["url"]
    _new(client, "With pic", f'<p>hi</p><p><img src="{url}" width="50%"></p>')
    assert f'class="thumb" src="{url}"' in client.get("/").get_data(as_text=True)


# ---------- shapes ----------
def test_shapes_render_and_validate(client):
    r = client.get("/shapes/star.svg?fill=ff0000&stroke=00ff00")
    body = r.get_data(as_text=True)
    assert r.status_code == 200 and r.mimetype == "image/svg+xml"
    assert 'fill="#ff0000"' in body and 'stroke="#00ff00"' in body
    assert "sandbox" in r.headers["Content-Security-Policy"]
    assert client.get("/shapes/nope.svg").status_code == 404


def test_shape_colours_cannot_inject_markup(client):
    body = client.get('/shapes/circle.svg?fill="/><script>alert(1)</script>&stroke=zzzzzz').get_data(as_text=True)
    assert "<script" not in body and 'fill="#2f5da8"' in body and 'stroke="#5b6b7a"' in body
    assert 'fill="none"' in client.get("/shapes/circle.svg?fill=none").get_data(as_text=True)


# ---------- headers + schema ----------
def test_security_headers(client):
    r = client.get("/login")
    csp = r.headers["Content-Security-Policy"]
    assert "script-src 'self'" in csp and "object-src 'none'" in csp and "frame-ancestors 'none'" in csp
    assert r.headers["X-Content-Type-Options"] == "nosniff"


def test_schema_upgrade_from_previous_release():
    """A database created by the first release must keep working after the upgrade."""
    class FakeDb:
        engine = create_engine("sqlite://")
    fake = FakeDb()
    with fake.engine.begin() as c:
        c.execute(text("CREATE TABLE notes (id INTEGER PRIMARY KEY, user_id INT, title VARCHAR(120), body TEXT)"))
        c.execute(text("INSERT INTO notes (user_id, title, body) VALUES (1, 'old', 'plain text')"))
    ensure_schema(fake)
    ensure_schema(fake)  # idempotent
    with fake.engine.begin() as c:
        row = c.execute(text("SELECT body_format, pinned, search_text FROM notes")).one()
    assert tuple(row) == ("text", 0, "")
