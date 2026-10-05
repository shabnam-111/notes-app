import secrets

from flask import abort, request, session


def csrf_token():
    if "_csrf" not in session:
        session["_csrf"] = secrets.token_hex(16)
    return session["_csrf"]


def check_csrf():
    """Accept the token from a form field or the X-CSRF-Token header (used by fetch())."""
    sent = request.form.get("_csrf") or request.headers.get("X-CSRF-Token", "")
    expected = session.get("_csrf")
    if not expected or not secrets.compare_digest(expected, sent):
        abort(400, "Your session expired. Reload the page and try again.")


SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
    "X-Frame-Options": "DENY",
    # Scripts only from our own origin (the editor is a static file; no inline scripts anywhere).
    # style-src needs 'unsafe-inline' because sanitised notes carry colour/size as style attributes.
    "Content-Security-Policy": (
        "default-src 'self'; img-src 'self'; style-src 'self' 'unsafe-inline'; "
        "script-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
    ),
}
