import pytest

from app.sanitize import first_image, html_to_text, plain_to_html, sanitize_html


@pytest.mark.parametrize("payload", [
    "<script>alert(1)</script>",
    '<img src=x onerror="alert(1)">',
    '<a href="javascript:alert(1)">x</a>',
    '<p onclick="alert(1)">x</p>',
    "<iframe src='//evil'></iframe>",
    '<svg onload="alert(1)"></svg>',
    '<style>body{display:none}</style>',
    '<form action="//evil"><input></form>',
    '<img src="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=">',
    '<img src="https://tracker.example/pixel.gif">',
    '<img src="/images/1/../../etc/passwd">',
])
def test_dangerous_markup_is_removed(payload):
    out = sanitize_html(f"<p>ok</p>{payload}").lower()
    for bad in ("<script", "onerror", "onclick", "onload", "javascript:", "<iframe", "<svg",
                "<style", "<form", "<input", "data:", "tracker.example", "passwd"):
        assert bad not in out
    assert "<p>ok</p>" in out


def test_formatting_survives():
    html = ('<h1>T</h1><p class="ql-align-center"><strong style="font-size: 24px; color: rgb(230, 0, 0); '
            'background-color: #ffff00;">hi</strong></p><ul><li>a</li></ul>')
    out = sanitize_html(html)
    assert 'class="ql-align-center"' in out
    assert "font-size: 24px" in out and "color: rgb(230, 0, 0)" in out and "background-color: #ffff00" in out
    assert "<ul><li>a</li></ul>" in out


def test_style_values_are_validated():
    out = sanitize_html(
        '<span style="color:red;background-color:url(http://x/y);font-size:99999px;position:fixed">x</span>'
    )
    assert "url(" not in out and "position" not in out and "99999" not in out
    assert "color:red" not in out  # named colours are not in the allow-list either


def test_only_our_images_and_shapes_are_allowed():
    ok1 = '<img src="/images/12" width="50%">'
    ok2 = '<img src="/shapes/star.svg?fill=2f5da8&stroke=none" width="120px">'
    assert 'src="/images/12"' in sanitize_html(ok1) and 'width="50%"' in sanitize_html(ok1)
    assert "/shapes/star.svg" in sanitize_html(ok2)
    assert "<img" not in sanitize_html('<img src="/shapes/star.svg?fill=red">')
    assert "<img" not in sanitize_html('<img src="/images/abc">')


def test_unknown_classes_and_bad_width_dropped():
    out = sanitize_html('<p class="ql-align-center admin-only"><img src="/images/1" width="100vw;x"></p>')
    assert "admin-only" not in out and "100vw" not in out


def test_links_get_rel_and_nbsp_becomes_space():
    out = sanitize_html('<a href="https://example.com">a&nbsp;b</a>')
    assert 'rel="noopener noreferrer nofollow"' in out and "&nbsp;" not in out


def test_helpers():
    assert html_to_text("<p>Hello</p><ul><li>one</li><li>two</li></ul>") == "Hello one two"
    assert html_to_text("<p>a &amp; b</p>") == "a & b"
    assert plain_to_html("a<b\n\nc") == "<p>a&lt;b</p><p><br></p><p>c</p>"
    assert first_image('<p><img src="/images/7"></p>') == "/images/7"
    assert first_image("<p>none</p>") is None
