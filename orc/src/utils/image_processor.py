import io
from typing import List

from PIL import Image


# Maximum largest dimension before downscaling — keeps EasyOCR fast.
_MAX_DIM = 2000


def preprocess_image(image_bytes: bytes) -> bytes:
    """
    Normalise an image for OCR:
    - Convert to RGB (drops alpha, handles palette images)
    - Downscale proportionally if either dimension exceeds ``_MAX_DIM``
    - Re-encode as PNG
    """
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    if max(image.size) > _MAX_DIM:
        ratio = _MAX_DIM / max(image.size)
        new_size = (int(image.width * ratio), int(image.height * ratio))
        image = image.resize(new_size, Image.LANCZOS)

    buf = io.BytesIO()
    image.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def pdf_to_images(pdf_bytes: bytes) -> List[bytes]:
    """
    Convert every page of a PDF to PNG bytes using pdf2image / poppler.

    Raises
    ------
    RuntimeError
        If pdf2image or poppler-utils are not installed.
    """
    try:
        from pdf2image import convert_from_bytes
    except ImportError as exc:
        raise RuntimeError(
            "pdf2image is required for PDF support. "
            "Install it with: pip install pdf2image  "
            "(also make sure poppler-utils is installed on the system)"
        ) from exc

    pages = convert_from_bytes(pdf_bytes, dpi=200)
    result: List[bytes] = []
    for page in pages:
        buf = io.BytesIO()
        page.save(buf, format="PNG")
        result.append(buf.getvalue())
    return result
