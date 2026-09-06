# backend/tests/unit/test_image_conversion.py
import io

from PIL import Image

from app.services.image_conversion import trim_transparent_padding


def _make_png(size: tuple[int, int], content_box: tuple[int, int, int, int]) -> bytes:
    """Build a transparent canvas with an opaque red square at `content_box`."""
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    left, top, right, bottom = content_box
    for x in range(left, right):
        for y in range(top, bottom):
            img.putpixel((x, y), (255, 0, 0, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_trim_transparent_padding_crops_to_content_bbox_with_margin():
    content_box = (40, 40, 60, 60)
    png_bytes = _make_png((100, 100), content_box)

    trimmed = trim_transparent_padding(png_bytes, padding=5)

    with Image.open(io.BytesIO(trimmed)) as result:
        # Expect (35, 35) to (65, 65): content box +/- the 5px padding margin.
        assert result.size == (30, 30)


def test_trim_transparent_padding_clamps_padding_to_image_bounds():
    content_box = (0, 0, 10, 10)
    png_bytes = _make_png((10, 10), content_box)

    trimmed = trim_transparent_padding(png_bytes, padding=20)

    with Image.open(io.BytesIO(trimmed)) as result:
        assert result.size == (10, 10)


def test_trim_transparent_padding_is_a_no_op_for_a_fully_opaque_image():
    img = Image.new("RGBA", (50, 50), (10, 20, 30, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    original_bytes = buf.getvalue()

    result = trim_transparent_padding(original_bytes)

    assert result == original_bytes
