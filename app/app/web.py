from flask import (Blueprint, abort, flash, redirect, render_template, request,
                   url_for)
from flask_login import current_user, login_required, login_user, logout_user

from .metrics import LOGINS, NOTES_CREATED, NOTES_DELETED
from .models import Note, User, db
from .sanitize import plain_to_html
from .security import check_csrf, csrf_token
from .shapes import SHAPES
from .validation import validate_credentials, validate_note

web = Blueprint("web", __name__)


@web.before_request
def csrf_protect():
    if request.method == "POST":
        check_csrf()


@web.app_context_processor
def inject_helpers():
    return {"csrf_token": csrf_token}


@web.get("/")
@login_required
def index():
    q = request.args.get("q", "").strip()
    notes = Note.for_user(current_user.id, q).all()
    return render_template(
        "index.html",
        pinned=[n for n in notes if n.pinned],
        others=[n for n in notes if not n.pinned],
        q=q,
    )


@web.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        errors = validate_credentials(username, password)
        if not errors and User.query.filter_by(username=username).first():
            errors["username"] = "That username is taken."
        if errors:
            return render_template("register.html", errors=errors, username=username), 400
        user = User(username=username)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        flash("Account created. Sign in to start writing.", "ok")
        return redirect(url_for("web.login"))
    return render_template("register.html", errors={}, username="")


@web.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        user = User.query.filter_by(username=username).first()
        if user and user.check_password(request.form.get("password", "")):
            LOGINS.labels("success").inc()
            login_user(user)
            return redirect(url_for("web.index"))
        LOGINS.labels("failure").inc()
        return render_template("login.html", error="Wrong username or password.", username=username), 401
    return render_template("login.html", error=None, username="")


@web.post("/logout")
def logout():
    logout_user()
    return redirect(url_for("web.login"))


def _editor(note, errors, title, body, pinned, status=200):
    return render_template(
        "form.html", note=note, errors=errors, title=title, body=body, pinned=pinned, shapes=list(SHAPES)
    ), status


@web.route("/notes/new", methods=["GET", "POST"])
@login_required
def new_note():
    if request.method == "POST":
        title, body = request.form.get("title", ""), request.form.get("body", "")
        pinned = request.form.get("pinned") == "on"
        errors = validate_note(title, body, "html")
        if errors:
            return _editor(None, errors, title, body, pinned, 400)
        note = Note(user_id=current_user.id, title=title.strip(), pinned=pinned)
        note.set_body(body, "html")
        db.session.add(note)
        db.session.commit()
        NOTES_CREATED.inc()
        flash("Note saved.", "ok")
        return redirect(url_for("web.index"))
    return _editor(None, {}, "", "", False)


def _own_note_or_404(note_id):
    note = Note.query.filter_by(id=note_id, user_id=current_user.id).first()
    if not note:
        abort(404)
    return note


@web.get("/notes/<int:note_id>")
@login_required
def view_note(note_id):
    return render_template("view.html", note=_own_note_or_404(note_id))


@web.route("/notes/<int:note_id>/edit", methods=["GET", "POST"])
@login_required
def edit_note(note_id):
    note = _own_note_or_404(note_id)
    if request.method == "POST":
        title, body = request.form.get("title", ""), request.form.get("body", "")
        pinned = request.form.get("pinned") == "on"
        errors = validate_note(title, body, "html")
        if errors:
            return _editor(note, errors, title, body, pinned, 400)
        note.title, note.pinned = title.strip(), pinned
        note.set_body(body, "html")
        db.session.commit()
        flash("Changes saved.", "ok")
        return redirect(url_for("web.index"))
    body = note.body if note.body_format == "html" else plain_to_html(note.body)
    return _editor(note, {}, note.title, body, note.pinned)


@web.post("/notes/<int:note_id>/pin")
@login_required
def toggle_pin(note_id):
    note = _own_note_or_404(note_id)
    note.pinned = not note.pinned
    db.session.commit()
    flash("Note pinned." if note.pinned else "Note unpinned.", "ok")
    if request.form.get("back") == "view":
        return redirect(url_for("web.view_note", note_id=note.id))
    return redirect(url_for("web.index", q=request.form.get("q") or None))


@web.post("/notes/<int:note_id>/delete")
@login_required
def delete_note(note_id):
    db.session.delete(_own_note_or_404(note_id))
    db.session.commit()
    NOTES_DELETED.inc()
    flash("Note deleted.", "ok")
    return redirect(url_for("web.index"))
