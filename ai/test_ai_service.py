"""Unit and Integration tests for CampusConnect AI Microservice."""

import base64
import io
import unittest
from PIL import Image
from fastapi.testclient import TestClient

from main import (
    app,
    _normalize_condition,
    _clean_json_response,
    _validate_image_bytes,
    _price_estimate,
    _evaluate_matches,
    _find_duplicate,
    PriceEstimateRequest,
    ComparableItem,
    MatchRequest,
    ListingInput,
    WantedPostInput,
)

client = TestClient(app)


def _create_test_image(width: int = 100, height: int = 100, color: str = "blue") -> bytes:
    img = Image.new("RGB", (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


class TestAiService(unittest.TestCase):
    def test_health_check(self):
        response = client.get("/api/v1/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertIn("mode", data)
        self.assertIn("vision_model", data)

    def test_condition_normalization(self):
        test_cases = [
            ("New", ("new", "New")),
            ("brand new", ("new", "New")),
            ("Like New", ("like_new", "Like New")),
            ("like_new", ("like_new", "Like New")),
            ("Good", ("good", "Good")),
            ("Fair", ("fair", "Fair")),
            ("acceptable", ("fair", "Fair")),
            ("poor", ("poor", "Poor")),
            ("heavily used", ("poor", "Poor")),
            ("random unknown", ("good", "Good")),
            (None, ("good", "Good")),
        ]
        for raw, expected in test_cases:
            with self.subTest(raw=raw):
                self.assertEqual(_normalize_condition(raw), expected)

    def test_clean_json_response(self):
        raw_markdown = """```json
        {
            "title": "Calculus Textbook",
            "condition": "good",
            "estimated_price": 350
        }
        ```"""
        parsed = _clean_json_response(raw_markdown)
        self.assertEqual(parsed["title"], "Calculus Textbook")
        self.assertEqual(parsed["estimated_price"], 350)

    def test_image_validation_min_resolution(self):
        tiny_bytes = _create_test_image(width=16, height=16)
        with self.assertRaises(Exception) as ctx:
            _validate_image_bytes(tiny_bytes)
        self.assertIn("at least 32x32 pixels", str(ctx.exception))

    def test_image_validation_valid(self):
        valid_bytes = _create_test_image(width=64, height=64)
        w, h = _validate_image_bytes(valid_bytes)
        self.assertEqual((w, h), (64, 64))

    def test_suggest_missing_image_returns_422(self):
        response = client.post("/api/v1/listings/suggest", json={})
        self.assertEqual(response.status_code, 422)

    def test_suggest_unsupported_content_type_returns_415(self):
        img_bytes = _create_test_image(50, 50)
        b64 = base64.b64encode(img_bytes).decode()
        response = client.post("/api/v1/listings/suggest", json={
            "image_base64": b64,
            "content_type": "image/gif"
        })
        self.assertEqual(response.status_code, 415)

    def test_suggest_with_brand_age_condition_hints(self):
        img_bytes = _create_test_image(64, 64)
        b64 = base64.b64encode(img_bytes).decode()
        response = client.post("/api/v1/listings/suggest", json={
            "image_base64": b64,
            "content_type": "image/jpeg",
            "name_or_brand": "Casio FX-991EX",
            "age": "6 months",
            "condition": "like_new",
            "description": "Used for one calculus semester, working screen."
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("title", data)
        self.assertIn("category", data)
        self.assertIn("description", data)
        self.assertIn("condition", data)
        self.assertIn(data["condition"], ["new", "like_new", "good", "fair", "poor"])
        self.assertIn("estimated_price", data)

    def test_multipart_upload_suggest(self):
        img_bytes = _create_test_image(64, 64)
        response = client.post(
            "/api/v1/listings/generate-upload",
            files={"file": ("test.jpg", img_bytes, "image/jpeg")},
            data={
                "name_or_brand": "Engineering Mechanics Textbook",
                "age": "1 year",
                "condition": "good",
            }
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("title", data)
        self.assertIn("category", data)

    def test_price_estimation_with_comparables(self):
        comparables = [
            ComparableItem(title="Book 1", category="Books", price=200, condition="Good"),
            ComparableItem(title="Book 2", category="Books", price=250, condition="Good"),
            ComparableItem(title="Book 3", category="Books", price=300, condition="Good"),
        ]
        req = PriceEstimateRequest(
            title="Book 4",
            category="Books",
            condition="like_new",
            comparable_items=comparables
        )
        result = _price_estimate(req)
        self.assertIsNotNone(result["estimated_price"])
        self.assertEqual(result["comparable_count"], 3)
        self.assertEqual(result["method"], "category_median_adjusted_for_condition")

    def test_price_estimation_insufficient_comparables(self):
        req = PriceEstimateRequest(
            title="Unique Drone",
            category="Aviation",
            condition="new",
            comparable_items=[]
        )
        result = _price_estimate(req)
        self.assertIsNone(result["estimated_price"])
        self.assertEqual(result["comparable_count"], 0)
        self.assertEqual(result["method"], "insufficient_comparables")

    def test_wanted_post_matching(self):
        req = MatchRequest(
            listing=ListingInput(id="l1", title="Casio Scientific Calculator", category="Electronics", price=400),
            wanted_posts=[
                WantedPostInput(id="w1", user_id="u1", title="Looking for Casio Calculator FX", category="Electronics", budget_max=500),
                WantedPostInput(id="w2", user_id="u2", title="Need Chemistry Textbook", category="Books", budget_max=300),
            ],
            threshold=0.3
        )
        matches = _evaluate_matches(req)
        self.assertTrue(len(matches) >= 1)
        self.assertEqual(matches[0]["wanted_post_id"], "w1")
        self.assertGreater(matches[0]["similarity_score"], 0.4)

    def test_ocr_duplicate_detection(self):
        text_a = "Computer Networks Unit 3 OSI Model Physical Layer Data Link Layer Network Layer Transport Layer."
        candidates = [
            {"listing_id": "c1", "text": "Computer Networks Unit 3 OSI Model Physical Layer Data Link Layer Network Layer Transport Layer."},
            {"listing_id": "c2", "text": "Data Structures Trees Graphs Hash Tables Algorithms."},
        ]
        result = _find_duplicate(text_a, candidates, threshold=0.82)
        self.assertTrue(result["is_duplicate"])
        self.assertEqual(result["matched_listing_id"], "c1")
        self.assertGreaterEqual(result["similarity"], 0.95)


if __name__ == "__main__":
    unittest.main()
