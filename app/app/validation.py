import re

USERNAME_RE = re.compile(r"^[A-Za-z0-9_]{3,32}$")
MAX_BODY = {"text": 10_000, "html": 200_000}


def validate_credentials(username, password):
    errors = {}
    if not username or not USERNAME_RE.match(username):
        errors["username"] = "3-32 characters: letters, numbers, underscore."
    if not password or len(password) < 8:
        errors["password"] = "Use at least 8 characters."
    return errors


def validate_note(title, body, body_format="text"):
    errors = {}
    title = (title or "").strip()
    body = body or ""
    if body_format not in MAX_BODY:
        errors["body_format"] = "body_format must be 'text' or 'html'."
        return errors
    if not title:
        errors["title"] = "Title is required."
    elif len(title) > 120:
        errors["title"] = "Title must be 120 characters or fewer."
    if len(body) > MAX_BODY[body_format]:
        errors["body"] = f"Note is too long (limit {MAX_BODY[body_format]:,} characters)."
    return errors
