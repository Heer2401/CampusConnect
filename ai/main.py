"""CampusConnect AI microservice.

Mock mode is the default so the marketplace team can integrate without API keys.
Set AI_MOCK_MODE=false and GROQ_API_KEY to enable image suggestions via Groq.
"""

from __future__ import annotations

import base64
import io
import json
import logging
import os
import re
import statistics
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field, HttpUrl

# Load local environment configuration
load_dotenv(Path(__file__).with_name(".env"))

app = FastAPI(
    title="CampusConnect AI Service",
    version="1.1.0",
    description="AI listing generation using Groq Vision API, price estimation, wanted-post matching, and OCR duplicate checks.",
)

# Resolve mock mode configuration (supports both AI_MOCK_MODE and AI_MOCK_MODEL)
_raw_mock = os.getenv("AI_MOCK_MODE")
if _raw_mock is None:
    _raw_mock = os.getenv("AI_MOCK_MODEL")
MOCK_MODE = (_raw_mock or "true").strip().lower() not in {"0", "false", "no"}

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_VISION_MODEL", "qwen/qwen3.8-27b")
REDIS_URL = os.getenv("REDIS_URL")
MATCH_EVENT_CHANNEL = os.getenv("MATCH_EVENT_CHANNEL", "match.found")
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
SUPPORTED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}

logger = logging.getLogger("campusconnect.ai")
logging.basicConfig(level=logging.INFO)


class ComparableItem(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    category: str = Field(min_length=1, max_length=80)
    price: float = Field(gt=0)
    condition: str = "Good"


class ListingSuggestionRequest(BaseModel):
    image_url: HttpUrl | None = None
    image_base64: str | None = Field(default=None, max_length=10_000_000)
    content_type: str = "image/jpeg"
    description: str | None = Field(default=None, max_length=1000)
    name_or_brand: str | None = Field(default=None, max_length=120)
    brand: str | None = Field(default=None, max_length=120)
    age: str | None = Field(default=None, max_length=80)
    condition: str | None = Field(default=None, max_length=50)
    comparable_items: list[ComparableItem] = Field(default_factory=list, max_length=100)


class PriceEstimateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    category: str = Field(min_length=1, max_length=80)
    condition: str = "Good"
    comparable_items: list[ComparableItem] = Field(default_factory=list, max_length=100)


class ListingInput(BaseModel):
    id: str = Field(min_length=1, max_length=100)
    title: str = Field(min_length=1, max_length=160)
    description: str = Field(default="", max_length=2000)
    category: str | None = Field(default=None, max_length=80)
    price: float | None = Field(default=None, ge=0)


class WantedPostInput(BaseModel):
    id: str = Field(min_length=1, max_length=100)
    user_id: str = Field(min_length=1, max_length=100)
    title: str = Field(min_length=1, max_length=160)
    description: str = Field(default="", max_length=2000)
    category: str | None = Field(default=None, max_length=80)
    budget_max: float | None = Field(default=None, ge=0)


class MatchRequest(BaseModel):
    listing: ListingInput
    wanted_posts: list[WantedPostInput] = Field(max_length=500)
    threshold: float = Field(default=0.35, ge=0, le=1)


class OcrTextRequest(BaseModel):
    document_text: str = Field(min_length=20, max_length=100_000)
    candidates: list[dict[str, Any]] = Field(default_factory=list, max_length=500)
    threshold: float = Field(default=0.82, ge=0.5, le=1)


# Valid condition mapping compatible with Mongoose Listing schema enum: ['new', 'like_new', 'good', 'fair', 'poor']
CONDITION_NORMALIZATION_MAP = {
    "new": "new",
    "brand new": "new",
    "like new": "like_new",
    "like_new": "like_new",
    "likenew": "like_new",
    "good": "good",
    "fair": "fair",
    "acceptable": "fair",
    "poor": "poor",
    "heavily used": "poor",
}

CONDITION_DISPLAY_MAP = {
    "new": "New",
    "like_new": "Like New",
    "good": "Good",
    "fair": "Fair",
    "poor": "Poor",
}


def _normalize_condition(raw_condition: str | None) -> tuple[str, str]:
    if not raw_condition:
        return "good", "Good"
    cleaned = raw_condition.strip().casefold()
    canonical = CONDITION_NORMALIZATION_MAP.get(cleaned, "good")
    return canonical, CONDITION_DISPLAY_MAP[canonical]


def _clean_json_response(content: str) -> dict[str, Any]:
    """Safely extracts JSON object from LLM response text."""
    text = content.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        text = match.group(0)
    return json.loads(text)


def _validate_image_bytes(image_bytes: bytes) -> tuple[int, int]:
    """Validates raw image bytes and ensures minimum resolution for vision models."""
    if not image_bytes:
        raise HTTPException(status_code=422, detail="Image data is empty.")
    if len(image_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"Image size exceeds the maximum limit of {MAX_UPLOAD_BYTES // (1024*1024)} MB.")
    try:
        from PIL import Image

        img = Image.open(io.BytesIO(image_bytes))
        img.verify()
        # Re-open to read dimensions after verify
        img = Image.open(io.BytesIO(image_bytes))
        width, height = img.size
        if width < 32 or height < 32:
            raise HTTPException(
                status_code=422,
                detail=f"Image resolution ({width}x{height}) is too small; image must be at least 32x32 pixels."
            )
        return width, height
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=422, detail="Invalid or unreadable image data.") from exc


def _mock_suggestion(
    name_or_brand: str | None = None,
    age: str | None = None,
    condition: str | None = None,
    description: str | None = None,
) -> dict[str, Any]:
    """Generates an intelligent mock suggestion based on optional user hints."""
    brand = (name_or_brand or "").strip()
    norm_condition, display_condition = _normalize_condition(condition or "Good")

    if brand:
        title = f"{brand} (Campus Pre-Owned)"
        desc_parts = [f"Authentic {brand} in {display_condition.lower()} condition."]
        if age:
            desc_parts.append(f"Used for approximately {age}.")
        if description:
            desc_parts.append(description.strip())
        else:
            desc_parts.append("Fully functional and well maintained by student owner.")
        category = "Electronics" if any(k in brand.lower() for k in ["calculator", "casio", "laptop", "mouse", "keyboard", "boat", "sony"]) else "Books & Notes"
        price = 450.0
    else:
        title = "Used Campus Study Material / Textbook"
        category = "Books & Notes"
        desc_parts = ["Pre-owned academic resource in good condition. All essential content intact."]
        if age:
            desc_parts.append(f"Owned for {age}.")
        if description:
            desc_parts.append(description.strip())
        price = 250.0

    return {
        "title": title[:160],
        "description": " ".join(desc_parts)[:1000],
        "category": category,
        "condition": norm_condition,
        "condition_display": display_condition,
        "estimated_price": price,
        "tags": ["campus", category.lower().replace(" ", ""), norm_condition],
        "source": "mock",
        "ai_metadata": {
            "model": "mock-vision-engine",
            "source": "mock",
            "generated_at": datetime.now(timezone.utc).isoformat(),
        },
    }


async def _groq_image_suggestion(request: ListingSuggestionRequest) -> dict[str, Any]:
    if not GROQ_API_KEY:
        logger.warning("GROQ_API_KEY is not configured; falling back to mock suggestions.")
        return _mock_suggestion(
            name_or_brand=request.name_or_brand or request.brand,
            age=request.age,
            condition=request.condition,
            description=request.description,
        )

    # Resolve brand / name
    brand_or_name = (request.name_or_brand or request.brand or "").strip()
    context_items = []
    if brand_or_name:
        context_items.append(f"Brand/Item Name: {brand_or_name}")
    if request.age:
        context_items.append(f"Age / Usage Duration: {request.age.strip()}")
    if request.condition:
        context_items.append(f"Seller Stated Condition: {request.condition.strip()}")
    if request.description:
        context_items.append(f"Additional Seller Notes: {request.description.strip()}")
    hints_text = "; ".join(context_items) if context_items else "No additional hints provided"

    prompt = (
        "You are an AI assistant for CampusConnect, a university student-to-student marketplace. "
        "Inspect the provided item image carefully and synthesize it with any seller hints to generate a comprehensive listing draft.\n"
        f"Optional Seller Hints: {hints_text}.\n\n"
        "Return ONLY a valid JSON object with the following fields:\n"
        "- title: string (concise, clear listing title between 5 and 90 characters, mentioning brand/model if recognized)\n"
        "- category: string (one best fit from: 'Books & Notes', 'Electronics', 'Stationery', 'Hostel Essentials', 'Furniture', 'Clothing & Accessories', 'Sports & Fitness', 'Other')\n"
        "- description: string (2-4 sentence informative description highlighting item features, utility for campus students, and visual condition)\n"
        "- condition: string (must be exactly one of: 'new', 'like_new', 'good', 'fair', 'poor')\n"
        "- condition_display: string (e.g. 'New', 'Like New', 'Good', 'Fair', 'Poor')\n"
        "- estimated_price: number (reasonable resale price estimate in INR; 0 if free or unknown)\n"
        "- tags: list of 2-5 lowercase keyword strings\n"
        "Ensure the condition assessment reflects visible wear and any seller age hints."
    )

    image_source = str(request.image_url) if request.image_url else f"data:{request.content_type};base64,{request.image_base64}"

    payload = {
        "model": GROQ_MODEL,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": image_source}},
            ],
        }],
        "response_format": {"type": "json_object"},
        "temperature": 0.2,
        "max_completion_tokens": 400,
    }

    try:
        async with httpx.AsyncClient(timeout=35.0) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                json=payload,
            )
            response.raise_for_status()
            raw_content = response.json()["choices"][0]["message"]["content"]
            suggestion = _clean_json_response(raw_content)
    except httpx.HTTPStatusError as exc:
        status = exc.response.status_code
        detail = f"Groq API returned HTTP {status}: {exc.response.text}"
        logger.error(detail)
        raise HTTPException(status_code=503, detail="AI suggestion provider encountered an error. You may enter details manually.") from exc
    except (httpx.RequestError, KeyError, IndexError, json.JSONDecodeError) as exc:
        logger.exception("Failed to parse Groq Vision response")
        raise HTTPException(status_code=503, detail="AI suggestion is temporarily unavailable; continue with manual listing entry.") from exc

    raw_cond = str(suggestion.get("condition", request.condition or "good"))
    norm_condition, display_condition = _normalize_condition(raw_cond)

    price = suggestion.get("estimated_price", 0)
    try:
        price = max(0.0, round(float(price), 2))
    except (TypeError, ValueError):
        price = 0.0

    tags = suggestion.get("tags", [])
    if not isinstance(tags, list):
        tags = [str(tags)]
    clean_tags = [str(t).strip().lower() for t in tags if str(t).strip()][:6]

    return {
        "title": str(suggestion.get("title", brand_or_name or "Campus Item"))[:160],
        "description": str(suggestion.get("description", ""))[:1000],
        "category": str(suggestion.get("category", "Other"))[:80],
        "condition": norm_condition,
        "condition_display": display_condition,
        "estimated_price": price,
        "tags": clean_tags,
        "source": "groq",
        "ai_metadata": {
            "model": GROQ_MODEL,
            "source": "groq",
            "generated_at": datetime.now(timezone.utc).isoformat(),
        },
    }


def _price_estimate(request: PriceEstimateRequest) -> dict[str, Any]:
    category_items = [
        item for item in request.comparable_items
        if item.category.strip().casefold() == request.category.strip().casefold()
    ]
    prices = [item.price for item in category_items]
    if not prices:
        return {
            "title": request.title,
            "category": request.category,
            "estimated_price": None,
            "price_low": None,
            "price_high": None,
            "comparable_count": 0,
            "submitted_comparable_count": 0,
            "excluded_outlier_count": 0,
            "outlier_filter": "none",
            "method": "insufficient_comparables",
        }

    submitted_count = len(prices)
    retained_prices = sorted(prices)
    # Use Tukey hinges (medians of the lower and upper halves) for stable
    # quartiles. With fewer than four records, the sample is too small to
    # identify outliers reliably, so retain every comparable.
    outlier_filter = "skipped_small_sample"
    if len(retained_prices) >= 4:
        midpoint = len(retained_prices) // 2
        if len(retained_prices) % 2:
            lower_half = retained_prices[:midpoint]
            upper_half = retained_prices[midpoint + 1:]
        else:
            lower_half = retained_prices[:midpoint]
            upper_half = retained_prices[midpoint:]
        q1 = statistics.median(lower_half)
        q3 = statistics.median(upper_half)
        iqr = q3 - q1
        lower_fence = q1 - (1.5 * iqr)
        upper_fence = q3 + (1.5 * iqr)
        retained_prices = [price for price in retained_prices if lower_fence <= price <= upper_fence]
        outlier_filter = "iqr_1_5"

    # At least two points remain when the sample is large enough to filter,
    # and all points are retained for smaller samples.
    q1, q3 = _quartiles(retained_prices)
    median = statistics.median(retained_prices)
    norm_cond, _ = _normalize_condition(request.condition)
    condition_factor = {"new": 1.0, "like_new": 0.90, "good": 0.75, "fair": 0.55, "poor": 0.35}
    factor = condition_factor.get(norm_cond, 0.75)
    estimate = round(median * factor / 0.75, 2)
    return {
        "title": request.title,
        "category": request.category,
        "estimated_price": estimate,
        "price_low": round(q1 * factor / 0.75, 2),
        "price_high": round(q3 * factor / 0.75, 2),
        "comparable_count": len(retained_prices),
        "submitted_comparable_count": submitted_count,
        "excluded_outlier_count": submitted_count - len(retained_prices),
        "outlier_filter": outlier_filter,
        "method": "category_median_adjusted_for_condition",
    }


def _quartiles(values: list[float]) -> tuple[float, float]:
    """Return Tukey hinge quartiles for an already sorted non-empty list."""
    midpoint = len(values) // 2
    if len(values) % 2:
        lower_half = values[:midpoint] or values
        upper_half = values[midpoint + 1:] or values
    else:
        lower_half = values[:midpoint] or values
        upper_half = values[midpoint:] or values
    return statistics.median(lower_half), statistics.median(upper_half)


_TOKEN_RE = re.compile(r"[a-z0-9]+")


def _tokens(text: str) -> set[str]:
    return set(_TOKEN_RE.findall(text.casefold()))


def _similarity(left: str, right: str) -> float:
    left_tokens, right_tokens = _tokens(left), _tokens(right)
    if not left_tokens or not right_tokens:
        return 0.0
    overlap = len(left_tokens & right_tokens) / len(left_tokens | right_tokens)
    phrase = SequenceMatcher(None, " ".join(sorted(left_tokens)), " ".join(sorted(right_tokens))).ratio()
    return round((0.75 * overlap) + (0.25 * phrase), 4)


def _evaluate_matches(request: MatchRequest) -> list[dict[str, Any]]:
    listing_text = " ".join(filter(None, [request.listing.title, request.listing.description, request.listing.category or ""]))
    matches = []
    for post in request.wanted_posts:
        wanted_text = " ".join(filter(None, [post.title, post.description, post.category or ""]))
        score = _similarity(listing_text, wanted_text)
        category_match = bool(
            request.listing.category and post.category
            and request.listing.category.casefold() == post.category.casefold()
        )
        if category_match:
            score = min(1.0, round(score + 0.15, 4))
        if post.budget_max is not None and request.listing.price is not None and request.listing.price > post.budget_max:
            score = round(score * 0.5, 4)
        if score >= request.threshold:
            matches.append({
                "wanted_post_id": post.id,
                "user_id": post.user_id,
                "listing_id": request.listing.id,
                "similarity_score": score,
            })
    return sorted(matches, key=lambda item: item["similarity_score"], reverse=True)


def _normalize_text(text: str) -> str:
    return " ".join(_TOKEN_RE.findall(text.casefold()))


def _find_duplicate(document_text: str, candidates: list[dict[str, Any]], threshold: float) -> dict[str, Any]:
    source = _normalize_text(document_text)
    best_id, best_score = None, 0.0
    for candidate in candidates:
        candidate_text = str(candidate.get("text", ""))
        if not candidate_text.strip():
            continue
        score = SequenceMatcher(None, source, _normalize_text(candidate_text)).ratio()
        if score > best_score:
            best_id, best_score = candidate.get("listing_id"), score
    return {
        "is_duplicate": best_score >= threshold,
        "matched_listing_id": best_id if best_score >= threshold else None,
        "similarity": round(best_score, 4),
        "threshold": threshold,
        "extracted_characters": len(source),
    }


def _extract_document_text(filename: str, content: bytes) -> str:
    extension = os.path.splitext(filename.lower())[1]
    if extension == ".pdf":
        try:
            from pypdf import PdfReader

            reader = PdfReader(io.BytesIO(content))
            extracted = "\n".join(page.extract_text() or "" for page in reader.pages)
            if len(extracted.strip()) >= 20:
                return extracted
        except Exception as exc:
            raise HTTPException(status_code=422, detail="Could not read the uploaded PDF.") from exc
        try:
            import fitz
            from PIL import Image
            import pytesseract

            document = fitz.open(stream=content, filetype="pdf")
            return "\n".join(
                pytesseract.image_to_string(Image.open(io.BytesIO(page.get_pixmap(dpi=180).tobytes("png"))))
                for page in document
            )
        except ImportError as exc:
            raise HTTPException(status_code=503, detail="Scanned PDF OCR requires PyMuPDF, Pillow, and Tesseract.") from exc
        except Exception as exc:
            raise HTTPException(status_code=422, detail="Could not run OCR on the scanned PDF.") from exc

    if extension in {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp"}:
        try:
            from PIL import Image
            import pytesseract

            return pytesseract.image_to_string(Image.open(io.BytesIO(content)))
        except ImportError as exc:
            raise HTTPException(status_code=503, detail="Image OCR dependencies are not installed; submit extracted text instead.") from exc
        except Exception as exc:
            raise HTTPException(status_code=422, detail="Could not extract text from the uploaded image.") from exc
    raise HTTPException(status_code=415, detail="Upload a PDF or a PNG/JPG/TIFF/BMP image.")


# ---------------- API Endpoints ----------------


@app.get("/")
@app.get("/api/v1/health")
def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "CampusConnect AI Service",
        "mode": "mock" if MOCK_MODE else "live",
        "vision_model": GROQ_MODEL,
        "provider": "Groq Vision" if not MOCK_MODE else "Mock Engine",
    }


@app.post("/api/suggestions")
@app.post("/api/v1/listings/suggest")
@app.post("/api/v1/listings/generate")
async def get_listing_suggestions(request: ListingSuggestionRequest) -> dict[str, Any]:
    """Suggest editable listing fields from an image URL or base64 image."""
    if not request.image_url and not request.image_base64:
        raise HTTPException(status_code=422, detail="Provide image_url or image_base64.")

    if request.content_type.lower() not in SUPPORTED_IMAGE_TYPES:
        raise HTTPException(status_code=415, detail="Only JPEG, PNG, and WebP images are supported.")

    if request.image_base64:
        try:
            image_bytes = base64.b64decode(request.image_base64, validate=True)
        except Exception as exc:
            raise HTTPException(status_code=422, detail="Invalid base64 image encoding.") from exc
        _validate_image_bytes(image_bytes)

    brand = request.name_or_brand or request.brand

    if MOCK_MODE:
        suggestion = _mock_suggestion(
            name_or_brand=brand,
            age=request.age,
            condition=request.condition,
            description=request.description,
        )
    else:
        suggestion = await _groq_image_suggestion(request)

    if request.comparable_items:
        price = _price_estimate(PriceEstimateRequest(
            title=suggestion["title"],
            category=suggestion["category"],
            condition=suggestion["condition"],
            comparable_items=request.comparable_items,
        ))
        if price["estimated_price"] is not None:
            suggestion["estimated_price"] = price["estimated_price"]
            suggestion["price_source"] = price["method"]

    return suggestion


@app.post("/api/v1/listings/generate-upload")
@app.post("/api/v1/listings/suggest-upload")
async def generate_listing_from_upload(
    file: UploadFile = File(...),
    name_or_brand: str | None = Form(None),
    brand: str | None = Form(None),
    age: str | None = Form(None),
    condition: str | None = Form(None),
    description: str | None = Form(None),
) -> dict[str, Any]:
    """Multipart upload endpoint for item images with optional name/brand, age, and condition."""
    content_type = file.content_type or "image/jpeg"
    if content_type.lower() not in SUPPORTED_IMAGE_TYPES:
        raise HTTPException(status_code=415, detail="Only JPEG, PNG, and WebP images are supported.")

    image_bytes = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(image_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"Image exceeds the {MAX_UPLOAD_BYTES // (1024*1024)} MB upload limit.")

    _validate_image_bytes(image_bytes)
    b64_str = base64.b64encode(image_bytes).decode("ascii")

    request = ListingSuggestionRequest(
        image_base64=b64_str,
        content_type=content_type,
        name_or_brand=name_or_brand or brand,
        age=age,
        condition=condition,
        description=description,
    )
    return await get_listing_suggestions(request)


@app.post("/api/v1/pricing/estimate")
def estimate_price(request: PriceEstimateRequest) -> dict[str, Any]:
    """Estimate a price from comparable listings supplied by the marketplace API."""
    return _price_estimate(request)


@app.post("/api/v1/matching/evaluate")
async def evaluate_wanted_post_matches(request: MatchRequest) -> dict[str, Any]:
    """Rank open wanted posts for a newly published listing."""
    matches = _evaluate_matches(request)
    event_published = False
    if matches and REDIS_URL:
        try:
            from redis.asyncio import Redis

            redis = Redis.from_url(REDIS_URL, decode_responses=True)
            try:
                for match in matches:
                    await redis.publish(MATCH_EVENT_CHANNEL, json.dumps({
                        "event": "match.found",
                        "data": match,
                    }))
                event_published = True
            finally:
                await redis.aclose()
        except Exception:
            logger.exception("Failed to publish match events to Redis")
    return {
        "listing_id": request.listing.id,
        "threshold": request.threshold,
        "match_count": len(matches),
        "matches": matches,
        "event_published": event_published,
        "method": "token_overlap_and_phrase_similarity_baseline",
    }


@app.post("/api/v1/ocr/check")
def check_ocr_text(request: OcrTextRequest) -> dict[str, Any]:
    """Compare OCR-extracted text with existing note/PYQ listing text."""
    return _find_duplicate(request.document_text, request.candidates, request.threshold)


@app.post("/api/v1/ocr/check-upload")
async def check_ocr_upload(
    file: UploadFile = File(...),
    threshold: float = 0.82,
) -> dict[str, Any]:
    """Extract text from a PDF or image, then return text for corpus comparison."""
    if not 0.5 <= threshold <= 1:
        raise HTTPException(status_code=422, detail="threshold must be between 0.5 and 1.0")
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"File exceeds the {MAX_UPLOAD_BYTES // (1024*1024)} MB upload limit.")
    extracted = _extract_document_text(file.filename or "", content)
    if len(extracted.strip()) < 20:
        raise HTTPException(status_code=422, detail="No readable text was found in the document.")
    return {
        "filename": file.filename,
        "extracted_text": extracted[:100_000],
        "extracted_characters": len(extracted),
        "note": "Compare extracted_text with existing note/PYQ listing text using /api/v1/ocr/check.",
    }
