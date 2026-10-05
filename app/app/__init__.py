import logging
import os
import time

from flask import Flask, g, jsonify, redirect, render_template, request, url_for
from flask_login import LoginManager
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from werkzeug.exceptions import HTTPException

from .logging_config import configure_logging
from .metrics import LATENCY, REQUESTS
from .models import User, db
from .sanitize import first_image, sanitize_html
from .schema import ensure_schema
from .security import SECURITY_HEADERS

log = logging.getLogger("notes")


DEV_SECRET = "dev-only-change-me"


def _secrets(config):
    """Convenient defaults for local SQLite development only.

    As soon as a real database is configured (DATABASE_URL) the secrets must be supplied, otherwise anyone who
    has read this file could forge login sessions and API tokens.
    """
    secret, jwt_secret = os.getenv("SECRET_KEY"), os.getenv("JWT_SECRET")
    local_dev = not os.getenv("DATABASE_URL") or (config or {}).get("TESTING")
    if (not secret or not jwt_secret) and not local_dev:
        raise RuntimeError("SECRET_KEY and JWT_SECRET must be set when DATABASE_URL is set.")
    return secret or DEV_SECRET, jwt_secret or DEV_SECRET + "-jwt"


def create_app(config=None):
    configure_logging(os.getenv("LOG_LEVEL", "INFO"))
    secret_key, jwt_secret = _secrets(config)
    app = Flask(__name__)
    app.config.update(
        SECRET_KEY=secret_key,
        JWT_SECRET=jwt_secret,
        SQLALCHEMY_DATABASE_URI=os.getenv("DATABASE_URL", "sqlite:///notes.db"),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        APP_VERSION=os.getenv("APP_VERSION", "dev"),
        APP_COLOR=os.getenv("APP_COLOR", ""),
        MAX_IMAGE_BYTES=2 * 1024 * 1024,
        MAX_IMAGES_PER_USER=200,
        MAX_CONTENT_LENGTH=3 * 1024 * 1024,
    )
    if config:
        app.config.update(config)

    db.init_app(app)
    login_manager = LoginManager(app)
    login_manager.login_view = "web.login"

    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(User, int(user_id))

    @login_manager.unauthorized_handler
    def unauthorized():
        return redirect(url_for("web.login"))

    from .api import api
    from .media import media
    from .web import web

    app.register_blueprint(api)
    app.register_blueprint(web)
    app.register_blueprint(media)
    _register_filters(app)

    _init_db(app)
    _register_hooks(app)
    _register_errors(app)
    _register_ops_routes(app)
    return app


def _init_db(app):
    """Retry so the app survives starting before Postgres is ready."""
    for attempt in range(1, 11):
        try:
            with app.app_context():
                db.create_all()
                ensure_schema(db)
            return
        except SQLAlchemyError:
            log.warning("database not ready (attempt %s/10)", attempt)
            time.sleep(3)
    raise RuntimeError("database unavailable")


def _register_filters(app):
    @app.template_filter("rich")
    def rich(note):
        """Render a note body. Re-sanitised on output as defence in depth; plain-text notes are escaped."""
        from markupsafe import Markup, escape

        if note.body_format == "html":
            return Markup(sanitize_html(note.body))
        return Markup("<p>" + str(escape(note.body)).replace("\n", "<br>") + "</p>")

    @app.template_filter("clean")
    def clean(raw):
        """Sanitise untrusted HTML before it is placed into the editor. Never use |safe on raw input."""
        from markupsafe import Markup

        return Markup(sanitize_html(raw))

    @app.template_filter("excerpt")
    def excerpt(note, limit=220):
        text = note.search_text if note.body_format == "html" else " ".join(note.body.split())
        return text if len(text) <= limit else text[:limit].rstrip() + "…"

    @app.template_filter("thumb")
    def thumb(note):
        return first_image(sanitize_html(note.body)) if note.body_format == "html" else None


def _json_path(path):
    return path.startswith(("/api/", "/uploads/"))


def _register_hooks(app):
    @app.before_request
    def start_timer():
        g.start = time.perf_counter()

    @app.after_request
    def record(response):
        for header, value in SECURITY_HEADERS.items():
            response.headers.setdefault(header, value)
        if request.path in ("/metrics", "/health"):
            return response
        endpoint = request.url_rule.rule if request.url_rule else "unmatched"
        elapsed = time.perf_counter() - g.get("start", time.perf_counter())
        REQUESTS.labels(request.method, endpoint, response.status_code).inc()
        LATENCY.labels(endpoint).observe(elapsed)
        log.info(
            "request",
            extra={
                "method": request.method,
                "path": request.path,
                "status": response.status_code,
                "duration_ms": round(elapsed * 1000, 2),
            },
        )
        return response


def _register_errors(app):
    @app.errorhandler(HTTPException)
    def http_error(err):
        if _json_path(request.path):
            message = "Image is too large (max 2 MB)." if err.code == 413 else err.description
            return jsonify({"error": message}), err.code
        return render_template("error.html", code=err.code, message=err.description), err.code

    @app.errorhandler(Exception)
    def server_error(err):
        log.exception("unhandled error")
        db.session.rollback()
        if _json_path(request.path):
            return jsonify({"error": "Internal server error"}), 500
        return render_template("error.html", code=500, message="Something went wrong on our side."), 500


def _register_ops_routes(app):
    @app.get("/health")
    def health():
        try:
            db.session.execute(text("SELECT 1"))
        except SQLAlchemyError:
            return jsonify({"status": "unhealthy"}), 503
        return jsonify(
            {
                "status": "ok",
                "version": app.config["APP_VERSION"],
                "color": app.config["APP_COLOR"],
            }
        )

    @app.get("/metrics")
    def metrics():
        return generate_latest(), 200, {"Content-Type": CONTENT_TYPE_LATEST}
