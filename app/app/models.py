from datetime import datetime, timezone

from flask_login import UserMixin
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash

db = SQLAlchemy()


def _now():
    return datetime.now(timezone.utc)


class User(UserMixin, db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(32), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=_now)
    notes = db.relationship("Note", backref="owner", cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class Note(db.Model):
    __tablename__ = "notes"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    title = db.Column(db.String(120), nullable=False)
    body = db.Column(db.Text, nullable=False, default="")
    # "text" = legacy plain text, "html" = sanitised rich text from the editor
    body_format = db.Column(db.String(10), nullable=False, default="text", server_default="text")
    pinned = db.Column(db.Boolean, nullable=False, default=False, server_default=db.false())
    # Plain-text copy of an html body, so search never matches markup such as "span" or "style".
    search_text = db.Column(db.Text, nullable=False, default="", server_default="")
    created_at = db.Column(db.DateTime(timezone=True), default=_now)
    updated_at = db.Column(db.DateTime(timezone=True), default=_now, onupdate=_now)

    @staticmethod
    def for_user(user_id, q=""):
        """A user's notes: pinned first, then most recently edited; optional search."""
        query = Note.query.filter_by(user_id=user_id)
        q = (q or "").strip()
        if q:
            like = f"%{q}%"
            query = query.filter(
                Note.title.ilike(like)
                | Note.search_text.ilike(like)
                | ((Note.body_format == "text") & Note.body.ilike(like))
            )
        return query.order_by(Note.pinned.desc(), Note.updated_at.desc())

    def set_body(self, raw, body_format):
        from .sanitize import html_to_text, sanitize_html

        if body_format == "html":
            self.body = sanitize_html(raw)
            self.search_text = html_to_text(self.body)
        else:
            self.body, self.search_text = raw, ""
        self.body_format = body_format

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "body": self.body,
            "body_format": self.body_format,
            "pinned": self.pinned,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Image(db.Model):
    """Uploaded pictures live in the database so every replica / blue-green colour serves them."""
    __tablename__ = "images"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    content_type = db.Column(db.String(40), nullable=False)
    data = db.Column(db.LargeBinary, nullable=False)
    size = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=_now)
