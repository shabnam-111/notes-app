import os
import sqlite3
from functools import wraps

from flask import (Flask, g, jsonify, redirect, render_template,
                   request, session, url_for)
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-change-me")
app.config["DATABASE"] = os.environ.get("DATABASE", "notes.db")


# ---------- Database ----------
def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(app.config["DATABASE"])
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(exc):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    db = get_db()
    db.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        );
        """
    )
    db.commit()


with app.app_context():
    init_db()


# ---------- Auth helper ----------
def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if "user_id" not in session:
            if request.path.startswith("/api/"):
                return jsonify(error="Login required"), 401
            return redirect(url_for("login"))
        return view(*args, **kwargs)
    return wrapped


# ---------- Web pages ----------
@app.route("/")
def index():
    return redirect(url_for("notes_page"))


@app.route("/register", methods=["GET", "POST"])
def register():
    error = None
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        if len(username) < 3 or len(password) < 6:
            error = "Username needs 3+ characters and password 6+ characters."
        else:
            db = get_db()
            try:
                db.execute(
                    "INSERT INTO users (username, password_hash) VALUES (?, ?)",
                    (username, generate_password_hash(password)),
                )
                db.commit()
                return redirect(url_for("login"))
            except sqlite3.IntegrityError:
                error = "Username already taken."
    return render_template("auth.html", title="Register",
                           button="Create account", error=error)


@app.route("/login", methods=["GET", "POST"])
def login():
    error = None
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        user = get_db().execute(
            "SELECT * FROM users WHERE username = ?", (username,)
        ).fetchone()
        if user and check_password_hash(user["password_hash"], password):
            session.clear()
            session["user_id"] = user["id"]
            session["username"] = user["username"]
            return redirect(url_for("notes_page"))
        error = "Invalid username or password."
    return render_template("auth.html", title="Login",
                           button="Login", error=error)


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route("/notes")
@login_required
def notes_page():
    return render_template("notes.html", username=session["username"])


# ---------- REST API ----------
def note_to_dict(row):
    return {k: row[k] for k in ("id", "title", "content", "created_at")}


def get_own_note(note_id):
    return get_db().execute(
        "SELECT * FROM notes WHERE id = ? AND user_id = ?",
        (note_id, session["user_id"]),
    ).fetchone()


def read_note_json():
    data = request.get_json(silent=True) or {}
    return str(data.get("title", "")).strip(), str(data.get("content", "")).strip()


@app.route("/health")
def health():
    return jsonify(status="ok")


@app.route("/api/notes", methods=["GET"])
@login_required
def list_notes():
    rows = get_db().execute(
        "SELECT * FROM notes WHERE user_id = ? ORDER BY id DESC",
        (session["user_id"],),
    ).fetchall()
    return jsonify([note_to_dict(r) for r in rows])


@app.route("/api/notes", methods=["POST"])
@login_required
def create_note():
    title, content = read_note_json()
    if not title:
        return jsonify(error="Title is required"), 400
    db = get_db()
    cur = db.execute(
        "INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)",
        (session["user_id"], title, content),
    )
    db.commit()
    return jsonify(note_to_dict(get_own_note(cur.lastrowid))), 201


@app.route("/api/notes/<int:note_id>", methods=["GET"])
@login_required
def get_note(note_id):
    note = get_own_note(note_id)
    if note is None:
        return jsonify(error="Note not found"), 404
    return jsonify(note_to_dict(note))


@app.route("/api/notes/<int:note_id>", methods=["PUT"])
@login_required
def update_note(note_id):
    if get_own_note(note_id) is None:
        return jsonify(error="Note not found"), 404
    title, content = read_note_json()
    if not title:
        return jsonify(error="Title is required"), 400
    db = get_db()
    db.execute("UPDATE notes SET title = ?, content = ? WHERE id = ?",
               (title, content, note_id))
    db.commit()
    return jsonify(note_to_dict(get_own_note(note_id)))


@app.route("/api/notes/<int:note_id>", methods=["DELETE"])
@login_required
def delete_note(note_id):
    if get_own_note(note_id) is None:
        return jsonify(error="Note not found"), 404
    db = get_db()
    db.execute("DELETE FROM notes WHERE id = ?", (note_id,))
    db.commit()
    return "", 204


# ---------- Error handling ----------
@app.errorhandler(404)
def not_found(e):
    if request.path.startswith("/api/"):
        return jsonify(error="Not found"), 404
    return "Page not found", 404


@app.errorhandler(500)
def server_error(e):
    if request.path.startswith("/api/"):
        return jsonify(error="Internal server error"), 500
    return "Something went wrong on our side.", 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000,
            debug=os.environ.get("FLASK_DEBUG") == "1")