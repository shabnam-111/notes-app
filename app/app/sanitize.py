"""Server-side allow-list sanitiser for rich notes. Never trust HTML coming from a browser."""
import html as htmllib
import re

import nh3

ALLOWED_TAGS = {
    "p", "br", "h1", "h2", "h3", "strong", "em", "u", "s", "ol", "ul", "li",
    "blockquote", "pre", "code", "a", "span", "img", "sub", "sup",
}
ALLOWED_ATTRS = {"*": {"class", "style"}, "a": {"href"}, "img": {"src", "width"}}

CLASS_RE = re.compile(r"^ql-(align-(center|right|justify)|indent-[1-8]|syntax|direction-rtl)$")
COLOR_RE = re.compile(
    r"^(#[0-9a-fA-F]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*[01]?(\.\d+)?\s*)?\))$"
)
SIZE_RE = re.compile(r"^\d{1,2}px$")
WIDTH_RE = re.compile(r"^\d{1,4}(px|%)?$")
HEX_OR_NONE = r"([0-9a-fA-F]{6}|none)"
IMG_SRC_RE = re.compile(
    r"^/(images/\d{1,12}"
    rf"|shapes/[a-z]{{1,20}}\.svg(\?(fill|stroke)={HEX_OR_NONE}(&(fill|stroke)={HEX_OR_NONE})?)?)$"
)
STYLE_RULES = {"color": COLOR_RE, "background-color": COLOR_RE, "font-size": SIZE_RE}


def _filter_style(value):
    kept = []
    for decl in value.split(";"):
        if ":" not in decl:
            continue
        prop, _, val = decl.partition(":")
        prop, val = prop.strip().lower(), val.strip()
        rule = STYLE_RULES.get(prop)
        if rule and rule.match(val):
            kept.append(f"{prop}: {val}")
    return "; ".join(kept) or None


def _attribute_filter(tag, attr, value):
    if attr == "class":
        kept = [c for c in value.split() if CLASS_RE.match(c)]
        return " ".join(kept) or None
    if attr == "style":
        return _filter_style(value)
    if tag == "img" and attr == "src":
        return value if IMG_SRC_RE.match(value) else None
    if tag == "img" and attr == "width":
        return value if WIDTH_RE.match(value) else None
    return value


def sanitize_html(raw):
    raw = (raw or "").replace("&nbsp;", " ").replace("\xa0", " ")
    clean = nh3.clean(
        raw,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRS,
        attribute_filter=_attribute_filter,
        url_schemes={"http", "https", "mailto"},
        link_rel="noopener noreferrer nofollow",
    )
    # An <img> whose src was rejected is just noise.
    return re.sub(r"<img(?![^>]*\bsrc=)[^>]*>", "", clean)


def html_to_text(raw):
    spaced = re.sub(r"</(p|h[1-3]|li|blockquote|pre)>|<br\s*/?>", " ", raw or "")
    text = htmllib.unescape(nh3.clean(spaced, tags=set()))
    return re.sub(r"\s+", " ", text).strip()


def plain_to_html(text):
    lines = (text or "").split("\n")
    return "".join(f"<p>{htmllib.escape(line) or '<br>'}</p>" for line in lines)


def first_image(raw):
    m = re.search(r'src="(/images/\d+)"', raw or "")
    return m.group(1) if m else None
