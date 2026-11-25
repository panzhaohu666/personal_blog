"""Slug generation helpers for ORM models."""

from __future__ import annotations

import re
import unicodedata
import uuid


def make_slug(text: str) -> str:
    """Generate a URL-friendly slug, falling back to a short UUID."""
    normalized = unicodedata.normalize("NFKD", text)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    cleaned = re.sub(r"[^\w\s-]", "", ascii_text).strip().lower()
    slug = re.sub(r"[-\s]+", "-", cleaned)
    if slug:
        return slug
    return str(uuid.uuid4())[:12]
