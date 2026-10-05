from flask import Blueprint, Response, abort, current_app, jsonify, request
from flask_login import current_user, login_required

from .models import Image, db
from .security import check_csrf
from .shapes import SHAPES, render_shape

media = Blueprint("media", __name__)

MAGIC = [
    (b"\x89PNG\r\n\x1a\n", "image/png"),
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"GIF87a", "image/gif"),
    (b"GIF89a", "image/gif"),
]


def sniff_image_type(data):
    """Trust the bytes, never the filename or Content-Type header. SVG is deliberately NOT accepted."""
    for magic, mime in MAGIC:
        if data.startswith(magic):
            return mime
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


@media.post("/uploads/image")
@login_required
def upload_image():
    check_csrf()
    file = request.files.get("image")
    if not file:
        return jsonify({"error": "No image was sent."}), 400
    data = file.read(current_app.config["MAX_IMAGE_BYTES"] + 1)
    if len(data) > current_app.config["MAX_IMAGE_BYTES"]:
        return jsonify({"error": "Image is too large (max 2 MB)."}), 413
    mime = sniff_image_type(data)
    if not mime:
        return jsonify({"error": "Only PNG, JPEG, GIF or WebP images are allowed."}), 400
    if Image.query.filter_by(user_id=current_user.id).count() >= current_app.config["MAX_IMAGES_PER_USER"]:
        return jsonify({"error": "Image limit reached for this account."}), 400
    img = Image(user_id=current_user.id, content_type=mime, data=data, size=len(data))
    db.session.add(img)
    db.session.commit()
    return jsonify({"url": f"/images/{img.id}"}), 201


@media.get("/images/<int:image_id>")
@login_required
def get_image(image_id):
    img = Image.query.filter_by(id=image_id, user_id=current_user.id).first()
    if not img:
        abort(404)
    return Response(
        bytes(img.data),
        mimetype=img.content_type,
        headers={"Cache-Control": "private, max-age=86400", "Content-Disposition": "inline"},
    )


@media.get("/shapes/<name>.svg")
def get_shape(name):
    svg = render_shape(name, request.args.get("fill"), request.args.get("stroke"))
    if svg is None:
        abort(404)
    return Response(
        svg,
        mimetype="image/svg+xml",
        headers={
            "Cache-Control": "public, max-age=86400",
            # even if opened directly, an SVG from here may not run anything or load anything
            "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        },
    )


SHAPE_NAMES = list(SHAPES)
