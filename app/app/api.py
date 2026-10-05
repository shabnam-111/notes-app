from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import Blueprint, current_app, g, jsonify, request

from .metrics import LOGINS, NOTES_CREATED, NOTES_DELETED
from .models import Note, User, db
from .validation import validate_credentials, validate_note

api = Blueprint("api", __name__, url_prefix="/api")


def _err(message, status, details=None):
    body = {"error": message}
    if details:
        body["details"] = details
    return jsonify(body), status


def token_required(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return _err("Missing bearer token", 401)
        try:
            data = jwt.decode(
                header[7:], current_app.config["JWT_SECRET"], algorithms=["HS256"]
            )
            user = db.session.get(User, int(data["sub"]))
        except (jwt.PyJWTError, KeyError, ValueError):
            return _err("Invalid or expired token", 401)
        if user is None:
            return _err("Invalid or expired token", 401)
        g.user = user
        return view(*args, **kwargs)

    return wrapper


@api.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    username, password = data.get("username"), data.get("password")
    errors = validate_credentials(username, password)
    if errors:
        return _err("Validation failed", 400, errors)
    if User.query.filter_by(username=username).first():
        return _err("Username already taken", 409)
    user = User(username=username)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return jsonify({"id": user.id, "username": user.username}), 201


@api.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    user = User.query.filter_by(username=data.get("username", "")).first()
    if not user or not user.check_password(data.get("password", "")):
        LOGINS.labels("failure").inc()
        return _err("Invalid username or password", 401)
    LOGINS.labels("success").inc()
    exp = datetime.now(timezone.utc) + timedelta(hours=1)
    token = jwt.encode(
        {"sub": str(user.id), "exp": exp}, current_app.config["JWT_SECRET"], "HS256"
    )
    return jsonify({"token": token, "expires_at": exp.isoformat()})


def _get_own_note(note_id):
    return Note.query.filter_by(id=note_id, user_id=g.user.id).first()


@api.get("/notes")
@token_required
def list_notes():
    notes = Note.for_user(g.user.id, request.args.get("q", "")).all()
    if request.args.get("pinned", "").lower() in ("true", "1"):
        notes = [n for n in notes if n.pinned]
    return jsonify([n.to_dict() for n in notes])


@api.post("/notes")
@token_required
def create_note():
    data = request.get_json(silent=True) or {}
    fmt = data.get("body_format", "text")
    errors = validate_note(data.get("title"), data.get("body"), fmt)
    if "pinned" in data and not isinstance(data["pinned"], bool):
        errors["pinned"] = "pinned must be true or false."
    if errors:
        return _err("Validation failed", 400, errors)
    note = Note(user_id=g.user.id, title=data["title"].strip(), pinned=data.get("pinned", False))
    note.set_body(data.get("body", ""), fmt)
    db.session.add(note)
    db.session.commit()
    NOTES_CREATED.inc()
    return jsonify(note.to_dict()), 201


@api.get("/notes/<int:note_id>")
@token_required
def get_note(note_id):
    note = _get_own_note(note_id)
    if not note:
        return _err("Note not found", 404)
    return jsonify(note.to_dict())


@api.put("/notes/<int:note_id>")
@token_required
def update_note(note_id):
    note = _get_own_note(note_id)
    if not note:
        return _err("Note not found", 404)
    data = request.get_json(silent=True) or {}
    fmt = data.get("body_format", note.body_format)
    errors = validate_note(data.get("title", note.title), data.get("body", note.body), fmt)
    if "pinned" in data and not isinstance(data["pinned"], bool):
        errors["pinned"] = "pinned must be true or false."
    if errors:
        return _err("Validation failed", 400, errors)
    note.title = data.get("title", note.title).strip()
    note.pinned = data.get("pinned", note.pinned)
    note.set_body(data.get("body", note.body), fmt)
    db.session.commit()
    return jsonify(note.to_dict())


@api.delete("/notes/<int:note_id>")
@token_required
def delete_note(note_id):
    note = _get_own_note(note_id)
    if not note:
        return _err("Note not found", 404)
    db.session.delete(note)
    db.session.commit()
    NOTES_DELETED.inc()
    return "", 204
