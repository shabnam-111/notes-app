"""Server-rendered SVG shapes. Only whitelisted shape names and validated colours ever reach the markup."""
import re

HEX_RE = re.compile(r"^[0-9a-fA-F]{6}$")

# name -> (viewBox width, viewBox height, markup template)
SHAPES = {
    "rectangle": (100, 70, '<rect x="3" y="3" width="94" height="64"{p}/>'),
    "rounded": (100, 70, '<rect x="3" y="3" width="94" height="64" rx="16"{p}/>'),
    "circle": (100, 100, '<circle cx="50" cy="50" r="46"{p}/>'),
    "triangle": (100, 90, '<polygon points="50,4 96,86 4,86"{p}/>'),
    "diamond": (100, 100, '<polygon points="50,4 96,50 50,96 4,50"{p}/>'),
    "star": (100, 96, '<polygon points="50,4 61,36 95,36 67,57 78,91 50,70 22,91 33,57 5,36 39,36"{p}/>'),
    "arrow": (100, 70, '<polygon points="4,22 58,22 58,4 96,35 58,66 58,48 4,48"{p}/>'),
    "line": (100, 10, '<line x1="5" y1="5" x2="95" y2="5" stroke-width="6" stroke-linecap="round"{s}/>'),
}


def _color(value, default):
    if value == "none":
        return "none"
    return f"#{value}" if value and HEX_RE.match(value) else default


def render_shape(name, fill=None, stroke=None):
    if name not in SHAPES:
        return None
    w, h, template = SHAPES[name]
    fill_c = _color(fill, "#2f5da8")
    stroke_c = _color(stroke, "#5b6b7a")
    if name == "line":
        # a line has no interior: its colour is the stroke colour
        body = template.format(s=f' stroke="{stroke_c if stroke_c != "none" else "#5b6b7a"}"')
    else:
        body = template.format(p=f' fill="{fill_c}" stroke="{stroke_c}" stroke-width="3" stroke-linejoin="round"')
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{body}</svg>'
